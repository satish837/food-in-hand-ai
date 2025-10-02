# 🍕 Food in Hand - AI Image Editor

A Next.js application that uses AI to add food items to photos, making it look like you're holding delicious dishes in your hand!

## ✨ Features

- **Step-by-step UI**: Clean, intuitive multi-step interface
- **Image Upload**: Drag & drop or click to upload photos
- **Dish Selection**: Choose from 12+ food items (pizza, burger, coffee, etc.)
- **AI Processing**: Powered by Replicate or Fal.ai APIs
- **Real-time Preview**: See your original and processed images side by side
- **Download & Share**: Save your creations or share them with friends
- **Responsive Design**: Works perfectly on desktop and mobile

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd fortune
npm install
```

### 2. Set up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Option 1: Replicate API (Recommended)
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Option 2: Fal.ai API (Alternative)
FAL_KEY=your_fal_api_key_here
```

### 3. Get API Keys

#### Replicate API (Recommended)
1. Go to [replicate.com](https://replicate.com)
2. Sign up for an account
3. Get your API token from [Account Settings](https://replicate.com/account/api-tokens)
4. Add it to your `.env.local` file

#### Fal.ai API (Alternative)
1. Go to [fal.ai](https://fal.ai)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your `.env.local` file

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ How It Works

1. **Upload**: User uploads their photo
2. **Select**: User chooses a food item from the grid
3. **Process**: AI service adds the food to the person's hand
4. **Result**: User sees the original and processed images side by side

## 🎨 Available Food Items

- 🍕 Pizza
- 🍔 Burger
- ☕ Coffee
- 🍝 Pasta
- 🍣 Sushi
- 🍦 Ice Cream
- 🥪 Sandwich
- 🍰 Cake
- 🥗 Salad
- 🌮 Tacos
- 🍩 Donut
- 🍜 Ramen

## 🔧 Technical Details

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Radix UI** for accessible components

### Backend
- **Next.js API Routes** for serverless functions
- **Replicate API** for AI image processing
- **Fal.ai** as alternative AI service
- **Base64 image handling** for uploads

### AI Models
- **Replicate**: ControlNet inpainting models
- **Fal.ai**: Flux Schnell for fast generation

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── process-image/
│   │       └── route.ts          # AI processing API
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page component
├── components/
│   ├── ImageUpload.tsx           # File upload component
│   ├── DishSelection.tsx         # Food selection grid
│   └── ResultDisplay.tsx         # Results display
└── lib/
    └── utils.ts                  # Utility functions
```

## 🎯 Customization

### Adding New Food Items

Edit `src/components/DishSelection.tsx` and add to the `dishes` array:

```typescript
{
  id: 'new-food',
  name: 'New Food',
  emoji: '🥘',
  description: 'Description of the food',
  prompt: 'a delicious new food item'
}
```

### Styling

The app uses Tailwind CSS. Main color scheme:
- Primary: Orange (`orange-500`)
- Secondary: Red (`red-500`)
- Background: Gradient from orange to red

### AI Prompts

Modify the AI prompts in `src/app/api/process-image/route.ts` to change how food items are added to images.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🐛 Troubleshooting

### Common Issues

1. **"No API keys found, using demo mode"**
   - Make sure your `.env.local` file exists and has the correct API key
   - Restart your development server after adding environment variables

2. **Image processing fails**
   - Check your API key is valid and has credits
   - Ensure the uploaded image is in a supported format (JPG, PNG, GIF)
   - Check the browser console for detailed error messages

3. **Images not displaying**
   - Check if the image URL is accessible
   - Ensure CORS is properly configured for your API

### Getting Help

- Check the browser console for error messages
- Verify your API keys are correct
- Make sure you have sufficient API credits
- Check the network tab for failed requests

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- [Replicate](https://replicate.com) for AI image processing
- [Fal.ai](https://fal.ai) for alternative AI services
- [Next.js](https://nextjs.org) for the amazing framework
- [Tailwind CSS](https://tailwindcss.com) for beautiful styling