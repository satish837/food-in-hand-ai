'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import DishSelection from '@/components/DishSelection';
import ResultDisplay from '@/components/ResultDisplay';
import { Upload, ChefHat, Download } from 'lucide-react';

type Step = 'upload' | 'select' | 'process' | 'result';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl);
    setCurrentStep('select');
  };

  const handleDishSelect = (dish: string) => {
    setSelectedDish(dish);
    setCurrentStep('process');
    processImage(uploadedImage!, dish);
  };

  const processImage = async (imageUrl: string, dish: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const diwaliStyle = 'polished digital illustration / vector art, cartoonish character design with smooth lines and subtle gradients, warm Indian Diwali color palette (yellows, oranges, browns), subject in Indian festival clothes, simple uncluttered background, clean vibrant aesthetic';
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          dish,
          style: diwaliStyle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const data = await response.json();
      setProcessedImage(data.processedImageUrl);
      setCurrentStep('result');
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setCurrentStep('select'); // Go back to dish selection
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('upload');
    setUploadedImage(null);
    setSelectedDish(null);
    setProcessedImage(null);
    setIsProcessing(false);
    setError(null);
  };

  const steps = [
    { id: 'upload', label: 'Upload Image', icon: Upload },
    { id: 'select', label: 'Select Dish', icon: ChefHat },
    { id: 'process', label: 'Processing', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Fortune
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your photo and see yourself holding delicious food items!
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = 
                (step.id === 'upload' && uploadedImage) ||
                (step.id === 'select' && selectedDish) ||
                (step.id === 'process' && processedImage);

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      isActive || isCompleted
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium ${
                      isActive || isCompleted ? 'text-orange-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-4 ${
                        isCompleted ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error processing image
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setError(null)}
                      className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 'upload' && (
            <ImageUpload onImageUpload={handleImageUpload} />
          )}

          {currentStep === 'select' && uploadedImage && (
            <DishSelection
              uploadedImage={uploadedImage}
              onDishSelect={handleDishSelect}
            />
          )}

          {currentStep === 'process' && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Processing your image...
              </h3>
              <p className="text-gray-600">
                Adding your selected dish to your photo using AI magic ✨
              </p>
            </div>
          )}

          {currentStep === 'result' && processedImage && (
            <ResultDisplay
              originalImage={uploadedImage!}
              processedImage={processedImage}
              selectedDish={selectedDish!}
              onReset={resetFlow}
            />
          )}
        </div>
      </div>
    </div>
  );
}
