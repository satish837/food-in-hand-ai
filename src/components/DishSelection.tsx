'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface DishSelectionProps {
  uploadedImage: string;
  onDishSelect: (dish: string) => void;
}

const dishes = [
  {
    id: 'pizza',
    name: 'Pizza',
    emoji: '🍕',
    description: 'Classic Italian pizza slice',
    prompt: 'a delicious pizza slice'
  },
  {
    id: 'burger',
    name: 'Burger',
    emoji: '🍔',
    description: 'Juicy beef burger',
    prompt: 'a mouth-watering burger'
  },
  {
    id: 'coffee',
    name: 'Coffee',
    emoji: '☕',
    description: 'Freshly brewed coffee',
    prompt: 'a steaming cup of coffee'
  },
  {
    id: 'pasta',
    name: 'Pasta',
    emoji: '🍝',
    description: 'Creamy pasta dish',
    prompt: 'a plate of delicious pasta'
  },
  {
    id: 'sushi',
    name: 'Sushi',
    emoji: '🍣',
    description: 'Fresh sushi rolls',
    prompt: 'beautiful sushi rolls'
  },
  {
    id: 'ice-cream',
    name: 'Ice Cream',
    emoji: '🍦',
    description: 'Sweet ice cream cone',
    prompt: 'a delicious ice cream cone'
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    emoji: '🥪',
    description: 'Fresh deli sandwich',
    prompt: 'a tasty sandwich'
  },
  {
    id: 'cake',
    name: 'Cake',
    emoji: '🍰',
    description: 'Decadent cake slice',
    prompt: 'a beautiful cake slice'
  },
  {
    id: 'salad',
    name: 'Salad',
    emoji: '🥗',
    description: 'Fresh green salad',
    prompt: 'a healthy salad bowl'
  },
  {
    id: 'tacos',
    name: 'Tacos',
    emoji: '🌮',
    description: 'Spicy Mexican tacos',
    prompt: 'delicious tacos'
  },
  {
    id: 'donut',
    name: 'Donut',
    emoji: '🍩',
    description: 'Sweet glazed donut',
    prompt: 'a sweet donut'
  },
  {
    id: 'ramen',
    name: 'Ramen',
    emoji: '🍜',
    description: 'Hot ramen bowl',
    prompt: 'a steaming bowl of ramen'
  }
];

export default function DishSelection({ uploadedImage, onDishSelect }: DishSelectionProps) {
  const [selectedDish, setSelectedDish] = useState<string | null>(null);

  const handleDishSelect = (dish: any) => {
    setSelectedDish(dish.id);
    onDishSelect(dish.prompt);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image Preview */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Your Photo
          </h3>
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded image"
              className="w-full h-96 object-cover rounded-2xl shadow-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20 rounded-2xl flex items-center justify-center">
              <p className="text-white text-lg font-medium">
                Choose a dish to add to your hand
              </p>
            </div>
          </div>
        </div>

        {/* Dish Selection */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Select a Dish
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {dishes.map((dish) => (
              <button
                key={dish.id}
                onClick={() => handleDishSelect(dish)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedDish === dish.id
                    ? 'border-orange-500 bg-orange-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{dish.emoji}</div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {dish.name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {dish.description}
                  </p>
                  {selectedDish === dish.id && (
                    <div className="mt-2 flex justify-center">
                      <div className="bg-orange-500 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {selectedDish && (
            <div className="mt-6">
              <button
                onClick={() => {
                  const dish = dishes.find(d => d.id === selectedDish);
                  if (dish) onDishSelect(dish.prompt);
                }}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
              >
                Generate Image with {dishes.find(d => d.id === selectedDish)?.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
