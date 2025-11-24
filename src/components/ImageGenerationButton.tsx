import React from 'react';
import { Image, Loader2, RefreshCw } from 'lucide-react';
import { comfyUIService } from '../services/comfyUIService';
import { promptExtractionService } from '../services/promptExtractionService';
import { imageStorageService } from '../services/imageStorageService';
import { ChatMessage } from '../types';

interface ImageGenerationButtonProps {
  message: ChatMessage;
  onImageGenerated: (messageId: string, imageUrl: string, imagePrompt: string) => void;
  onImageGenerationStart: (messageId: string) => void;
  onImageGenerationError: (messageId: string) => void;
  sceneState?: any;
  className?: string;
}

export const ImageGenerationButton: React.FC<ImageGenerationButtonProps> = ({
  message,
  onImageGenerated,
  onImageGenerationStart,
  onImageGenerationError,
  sceneState,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Chỉ hiển thị nút cho AI messages và khi ComfyUI được bật
  if (message.role !== 'ai') return null;

  const comfyUISettings = comfyUIService.loadSettings();
  if (!comfyUISettings.enabled) return null;

  // Nếu đã có ảnh hoặc đang tạo ảnh, không hiển thị nút
  if (message.imageUrl || message.isGeneratingImage) return null;

  const handleGenerateImage = async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      onImageGenerationStart(message.timestamp.toString());

      // Extract visual prompt from message content
      const { prompt, negativePrompt } = await promptExtractionService.extractVisualPrompt(
        message.content,
        sceneState || { location: null, npcs: [], items: [] },
        comfyUISettings.style,
        comfyUISettings.customStyle,
        comfyUISettings.qualityLevel,
        comfyUISettings.enableCharacterConsistency
      );

      // Generate image
      const imageBase64 = await comfyUIService.generateImage(
        prompt, 
        negativePrompt, 
        comfyUISettings.resolution
      );

      // Save image to storage
      const filename = `manual_${Date.now()}.png`;
      const filepath = await imageStorageService.saveImage(imageBase64, filename);

      // Notify parent component
      onImageGenerated(message.timestamp.toString(), filepath, prompt);

    } catch (error) {
      console.error('Error generating image manually:', error);
      onImageGenerationError(message.timestamp.toString());
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonContent = () => {
    if (isGenerating) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Tạo ảnh...</span>
        </>
      );
    }

    if (message.hasImageGenerationFailed) {
      return (
        <>
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </>
      );
    }

    return (
      <>
        <Image className="w-4 h-4" />
        <span>Tạo ảnh</span>
      </>
    );
  };

  const getButtonStyle = () => {
    if (isGenerating) {
      return "bg-yellow-600 hover:bg-yellow-700 text-white";
    }

    if (message.hasImageGenerationFailed) {
      return "bg-yellow-700 hover:bg-yellow-800 text-white";
    }

    return "bg-yellow-600 hover:bg-yellow-700 text-white";
  };

  return (
    <button
      onClick={handleGenerateImage}
      disabled={isGenerating}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg
        transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${getButtonStyle()}
        ${className}
      `}
      title={message.hasImageGenerationFailed ? "Tạo ảnh thất bại, nhấn để thử lại" : "Tạo ảnh cho response này"}
    >
      {getButtonContent()}
    </button>
  );
};
