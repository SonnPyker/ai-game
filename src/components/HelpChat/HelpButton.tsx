import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { HelpButtonVariant } from '../../types/helpChat';
import { HelpChatModal } from './HelpChatModal';

interface HelpButtonProps {
  variant: HelpButtonVariant;
  className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ variant, className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const baseClasses = "p-2 border rounded-lg transition-colors duration-200 mobile-button touch-feedback";
  
  const variantClasses = {
    fixed: "fixed top-4 right-4 z-40 bg-blue-800 border-blue-700 text-white hover:bg-blue-900 shadow-lg",
    inline: "bg-blue-800 border-blue-700 text-white hover:bg-blue-900"
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={buttonClasses}
        title="Trợ giúp Game"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <HelpChatModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};
