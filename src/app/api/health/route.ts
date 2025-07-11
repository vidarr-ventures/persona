import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { sql } from '@vercel/postgres';
import { Queue } from '@/lib/queue';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: { status: 'unknown', message: '', responseTime: 0 },
      redis: { status: 'unknown', message: '', responseTime: 0 },
      queue: { status: 'unknown', message: '', stats: null as any },
      environment: { status: 'unknown', message: '', missing: [] as string[] },
    },
    summary: {
      healthy: 0,
      total: 4,
    },
  };

  // Database check
  try {
    const dbStart = Date.now();
    await sql`SELECT 1`;
    checks.checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    checks.checks.database = {
      status: 'unhealthy',
      message: `Database error: ${errorMessage}`,
      responseTime: 0,
    };
  }

  // Redis/KV check
  try {
    const kvStart = Date.now();
    await kv.ping();
    checks.checks.redis = {
      status: 'healthy',
      message: 'Redis connection successful',
      responseTime: Date.now() - kvStart,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
    checks.checks.redis = {
      status: 'unhealthy',
      message: `Redis error: ${errorMessage}`,
      responseTime: 0,
    };
  }

  // Queue check
  try {
    const stats = await Queue.getQueueStats();
    checks.checks.queue = {
      status: 'healthy',
      message: 'Queue system operational',
      stats: stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown queue error';
    checks.checks.queue = {
      status: 'unhealthy',
      message: `Queue error: ${errorMessage}`,
      stats: null,
    };
  }

  // Environment variables check
  const requiredEnvVars = [
    'POSTGRES_URL',
    'KV_URL',
    'OPENAI_API_KEY',
    'SCRAPEOWL_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length === 0) {
    checks.checks.environment = {
      status: 'healthy',
      message: 'All required environment variables present',
      missing: [],
    };
  } else {
    checks.checks.environment = {
      status: 'unhealthy',
      message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      missing: missingEnvVars,
    };
  }

  // Calculate summary
  const healthyChecks = Object.values(checks.checks).filter(check => check.status === 'healthy').length;
  checks.summary.healthy = healthyChecks;

  // Overall status
  if (healthyChecks === checks.summary.total) {
    checks.status = 'healthy';
  } else if (healthyChecks > 0) {
    checks.status = 'degraded';
  } else {
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 
                    checks.status === 'degraded' ? 207 : 503;

  return NextResponse.json(checks, { status: statusCode });
}

export async function POST() {
  try {
    // Trigger system maintenance
    console.log('Running system maintenance...');
    
    // Clean up stuck jobs
    await Queue.processRetryableJobs();
    
    // Trigger queue processing
    await Queue.triggerProcessing();
    
    return NextResponse.json({
      success: true,
      message: 'System maintenance completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown maintenance error';
    return NextResponse.json(
      { 
        error: 'System maintenance failed',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
