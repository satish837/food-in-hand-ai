'use client';

import { useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const demos = [
    {
      id: 'pizza',
      name: 'Pizza Slice',
      emoji: '🍕',
      original: '/demo-images/original-pizza.jpg',
      processed: '/demo-images/processed-pizza.jpg',
      description: 'Classic Italian pizza slice added to hand'
    },
    {
      id: 'coffee',
      name: 'Coffee Cup',
      emoji: '☕',
      original: '/demo-images/original-coffee.jpg',
      processed: '/demo-images/processed-coffee.jpg',
      description: 'Steaming hot coffee cup in hand'
    },
    {
      id: 'burger',
      name: 'Burger',
      emoji: '🍔',
      original: '/demo-images/original-burger.jpg',
      processed: '/demo-images/processed-burger.jpg',
      description: 'Juicy burger with all the fixings'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to App
            </Link>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🍕 Demo Gallery
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See examples of how Food in Hand transforms your photos with AI magic!
          </p>
        </div>

        {/* Demo Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setSelectedDemo(demo.id)}
            >
              <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                <div className="text-6xl">{demo.emoji}</div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {demo.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {demo.description}
                </p>
                <div className="mt-4 flex items-center text-orange-600 text-sm font-medium">
                  View Example
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {selectedDemo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {demos.find(d => d.id === selectedDemo)?.name} Example
                  </h2>
                  <button
                    onClick={() => setSelectedDemo(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Original</h3>
                    <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                      <p className="text-gray-500">Original photo would appear here</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">With {demos.find(d => d.id === selectedDemo)?.name}</h3>
                    <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                      <p className="text-gray-500">AI-processed photo would appear here</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Try It Yourself
                    <ExternalLink className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

       
      </div>
    </div>
  );
}
