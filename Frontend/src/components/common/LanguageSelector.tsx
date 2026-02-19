import { DropdownMenu } from './DropdownMenu';
import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className }) => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
            "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            className
          )}
          aria-label={t('languages.chooseLanguage')}
        >
          <span className="text-xl" role="img" aria-label={currentLanguage.name}>
            {currentLanguage.flag}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentLanguage.name}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenu.Item
            key={lang.code}
            onSelect={() => i18n.changeLanguage(lang.code)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-xl" role="img" aria-label={lang.name}>
              {lang.flag}
            </span>
            <span className={cn(
              "text-sm",
              i18n.language === lang.code ? "font-bold text-blue-600" : "text-gray-700 dark:text-gray-200"
            )}>
              {lang.name}
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
