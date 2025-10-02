'use client';

import { useState } from 'react';
import { Download, RotateCcw, Share2, Heart } from 'lucide-react';

interface ResultDisplayProps {
  originalImage: string;
  processedImage: string;
  selectedDish: string;
  onReset: () => void;
}

export default function ResultDisplay({
  originalImage,
  processedImage,
  selectedDish,
  onReset
}: ResultDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `food-in-hand-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my food in hand!',
          text: `I just created this amazing image with ${selectedDish} using Food in Hand!`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎉 Your Image is Ready!
        </h2>
        <p className="text-gray-600">
          Here's your photo with {selectedDish} added using AI magic
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Original Image */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 text-center">
            Original
          </h3>
          <div className="relative">
            <img
              src={originalImage}
              alt="Original image"
              className="w-full h-96 object-cover rounded-2xl shadow-lg"
            />
          </div>
        </div>

        {/* Processed Image */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 text-center">
            With {selectedDish}
          </h3>
          <div className="relative">
            <img
              src={processedImage}
              alt="Processed image"
              className="w-full h-96 object-cover rounded-2xl shadow-lg"
            />
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 rounded-full transition-colors ${
                  isLiked
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-red-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {isDownloading ? 'Downloading...' : 'Download Image'}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 bg-gray-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Create Another
        </button>
      </div>

      {/* Fun Stats */}
      <div className="mt-12 bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-orange-600">✨</div>
            <div className="text-lg font-semibold text-gray-900">AI Powered</div>
            <div className="text-sm text-gray-600">Advanced image processing</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">⚡</div>
            <div className="text-lg font-semibold text-gray-900">Lightning Fast</div>
            <div className="text-sm text-gray-600">Processed in seconds</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">🎯</div>
            <div className="text-lg font-semibold text-gray-900">Realistic</div>
            <div className="text-sm text-gray-600">Natural looking results</div>
          </div>
        </div>
      </div>
    </div>
  );
}
