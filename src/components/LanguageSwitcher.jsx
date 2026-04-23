import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', label: t('common.english'), flag: '🇬🇧' },
    { code: 'hi', label: t('common.hindi'), flag: '🇮🇳' },
    { code: 'kn', label: t('common.kannada'), flag: '🇮🇳' },
    { code: 'mr', label: t('common.marathi'), flag: '🇮🇳' },
    { code: 'ur', label: t('common.urdu'), flag: '🇵🇰' },
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md group"
      >
        <Globe size={18} className="text-blue-400 group-hover:rotate-12 transition-transform" />
        <span className="text-gray-700">{currentLanguage.label}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
            {languages.map((lng) => (
              <button
                key={lng.code}
                onClick={() => changeLanguage(lng.code)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition ${
                  i18n.language === lng.code 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{lng.label}</span>
                {i18n.language === lng.code && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
