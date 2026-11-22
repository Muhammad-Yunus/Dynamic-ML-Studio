import React from 'react';
import { ModuleDefinition } from '../shared/types';

export function ModuleIcon({
  iconType,
  className = 'w-5 h-5',
}: {
  iconType: ModuleDefinition['iconType'];
  className?: string;
}) {
  const color = '#3A8AC1';
  switch (iconType) {
    case 'clean':
    case 'split':
    case 'transform':
      // Matches the mockup's crisp blue table + funnel/grid icon on Clean Missing Data & Split Data
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="2.5" y="3.5" width="12" height="10" rx="1" stroke={color} strokeWidth="1.5" />
          <path d="M2.5 7H14.5M6.5 7V13.5M10.5 7V13.5" stroke={color} strokeWidth="1.3" />
          <path d="M13 11L17.5 16V20.5L19.5 19.5V16L22 11H13Z" fill={color} />
        </svg>
      );

    case 'model-class':
    case 'model-reg':
    case 'model-cluster':
    case 'model-anomaly':
    case 'train':
    case 'score':
    case 'evaluate':
      // Matches the mockup's crisp monitor + ML flask icon on Two-Class Logistic Regression, Train Model, Score Model
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="2.5" y="3.5" width="19" height="14" rx="1.5" stroke={color} strokeWidth="1.5" />
          <path d="M8.5 20.5H15.5M12 17.5V20.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M10.5 6.5V9.2L8.2 14.2C7.9 14.8 8.3 15.3 9 15.3H15C15.7 15.3 16.1 14.8 15.8 14.2L13.5 9.2V6.5"
            stroke={color}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M9.6 6.5H14.4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9.3 12.8H14.7L15.4 14.3H8.6L9.3 12.8Z" fill={color} />
        </svg>
      );

    case 'feature':
      // Magnifying glass over bars matching mockup's Feature Selection icon
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="10" cy="10" r="6" stroke={color} strokeWidth="1.6" />
          <path d="M14.5 14.5L20 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M7.5 11.5V9.5M10 11.5V7.5M12.5 11.5V8.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'text':
      // Analytics magnifying glass over bar chart matching mockup's Text Analytics icon
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="9.5" cy="9.5" r="5.5" stroke={color} strokeWidth="1.5" />
          <path d="M13.5 13.5L18.5 18.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 6H21M17 9.5H21M16 13H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'dataset':
    case 'io':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <ellipse cx="12" cy="6.5" rx="7.5" ry="2.8" stroke={color} strokeWidth="1.5" />
          <path d="M4.5 6.5V12C4.5 13.5 7.8 14.8 12 14.8C16.2 14.8 19.5 13.5 19.5 12V6.5" stroke={color} strokeWidth="1.5" />
          <path d="M4.5 12V17.5C4.5 19 7.8 20.3 12 20.3C16.2 20.3 19.5 19 19.5 17.5V12" stroke={color} strokeWidth="1.5" />
        </svg>
      );

    case 'stats':
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 19.5H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="6" y="11" width="3" height="6.5" fill={color} />
          <rect x="10.5" y="7" width="3" height="10.5" fill={color} />
          <rect x="15" y="4.5" width="3" height="13" fill={color} />
        </svg>
      );
  }
}

export function RailIcon({ type }: { type: 'projects' | 'experiments' | 'webservices' | 'datasets' | 'models' | 'settings' }) {
  switch (type) {
    case 'projects':
      return (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
          <path
            d="M3 7.5C3 6.7 3.7 6 4.5 6H10.5L12.5 8.5H23.5C24.3 8.5 25 9.2 25 10V21.5C25 22.3 24.3 23 23.5 23H4.5C3.7 23 3 22.3 3 21.5V7.5Z"
            stroke="white"
            strokeWidth="1.8"
          />
          <path
            d="M15.5 11.5V14L13 18.8C12.7 19.4 13.1 20 13.8 20H20.2C20.9 20 21.3 19.4 21 18.8L18.5 14V11.5"
            fill="white"
          />
        </svg>
      );
    case 'experiments':
      return (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
          <path d="M10.5 5H17.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M12 5V11L6.6 20.8C6 21.9 6.8 23.2 8 23.2H20C21.2 23.2 22 21.9 21.4 20.8L16 11V5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M8.5 18H19.5L20.8 20.8C21 21.3 20.6 22 20 22H8C7.4 22 7 21.3 7.2 20.8L8.5 18Z" fill="white" />
        </svg>
      );
    case 'webservices':
      return (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
          <circle cx="14" cy="14" r="9.5" stroke="white" strokeWidth="1.8" />
          <ellipse cx="14" cy="14" rx="4.5" ry="9.5" stroke="white" strokeWidth="1.5" />
          <path d="M4.8 14H23.2M6.2 9.5H21.8M6.2 18.5H21.8" stroke="white" strokeWidth="1.4" />
        </svg>
      );
    case 'datasets':
      return (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
          <ellipse cx="14" cy="8" rx="8" ry="3" stroke="white" strokeWidth="1.8" />
          <path d="M6 8V14C6 15.7 9.6 17 14 17C18.4 17 22 15.7 22 14V8" stroke="white" strokeWidth="1.8" />
          <path d="M6 14V20C6 21.7 9.6 23 14 23C18.4 23 22 21.7 22 20V14" stroke="white" strokeWidth="1.8" />
        </svg>
      );
    case 'models':
      return (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
          <path d="M14 4.5L22.5 9.2V18.8L14 23.5L5.5 18.8V9.2L14 4.5Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 14L22.5 9.2M14 14L5.5 9.2M14 14V23.5" stroke="white" strokeWidth="1.6" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
          <circle cx="14" cy="14" r="3.5" stroke="white" strokeWidth="1.8" />
          <path
            d="M14 4.5V7M14 21V23.5M4.5 14H7M21 14H23.5M7.3 7.3L9.1 9.1M18.9 18.9L20.7 20.7M20.7 7.3L18.9 9.1M9.1 18.9L7.3 20.7"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="14" cy="14" r="7.5" stroke="white" strokeWidth="1.8" strokeDasharray="3 3" />
        </svg>
      );
  }
}
