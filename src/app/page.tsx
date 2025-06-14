'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FormData {
  primaryProductUrl: string;
  amazonProductUrl: string;
  primaryKeywords: string;
  secondaryKeywords: string;
  additionalKeywords: string;
}

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    primaryProductUrl: '',
    amazonProductUrl: '',
    primaryKeywords: '',
    secondaryKeywords: '',
    additionalKeywords: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Combine all keywords into the expected format for backward compatibility
      const targetKeywords = [
        formData.primaryKeywords,
        formData.secondaryKeywords,
        formData.additionalKeywords
      ].filter(keyword => keyword.trim() !== '').join(', ');

      const submitData = {
        primaryProductUrl: formData.primaryProductUrl,
        amazonProductUrl: formData.amazonProductUrl,
        targetKeywords: targetKeywords
      };

      const response = await fetch('/api/jobs/create-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/dashboard/${data.jobId}`);
      } else {
        setError(data.error || 'Failed to start analysis');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Customer Persona Research
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.primaryProductUrl}
              onChange={(e) => setFormData({...formData, primaryProductUrl: e.target.value})}
              placeholder="https://yoursite.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amazon Product URL (Optional)
            </label>
            <input
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.amazonProductUrl}
              onChange={(e) => setFormData({...formData, amazonProductUrl: e.target.value})}
              placeholder="https://amazon.com/dp/..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Keywords <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.primaryKeywords}
                onChange={(e) => setFormData({...formData, primaryKeywords: e.target.value})}
                placeholder="grounding sheets"
              />
              <p className="text-xs text-gray-500 mt-1">Main product or topic keywords</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Keywords (Optional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.secondaryKeywords}
                onChange={(e) => setFormData({...formData, secondaryKeywords: e.target.value})}
                placeholder="earthing mats"
              />
              <p className="text-xs text-gray-500 mt-1">Related or alternative terms</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Keywords (Optional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.additionalKeywords}
                onChange={(e) => setFormData({...formData, additionalKeywords: e.target.value})}
                placeholder="sleep improvement"
              />
              <p className="text-xs text-gray-500 mt-1">Broader problem or benefit keywords</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Starting Analysis...' : 'Start Customer Research'}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Use different keyword fields to capture various aspects - 
            primary (main product), secondary (alternatives), additional (problems/benefits).
          </p>
        </div>
      </div>
    </div>
  );
}