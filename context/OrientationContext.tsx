import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Dimensions } from 'react-native';

type Orientation = 'portrait' | 'landscape';

interface OrientationContextType {
  orientation: Orientation;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isTablet: boolean;
  numColumns: number; // Dynamic column count based on device and orientation
}

const OrientationContext = createContext<OrientationContextType | undefined>(undefined);

interface OrientationProviderProps {
  children: ReactNode;
}

export function OrientationProvider({ children }: OrientationProviderProps) {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [orientation, setOrientation] = useState<Orientation>(
    Dimensions.get('window').width < Dimensions.get('window').height ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      const newOrientation = window.width < window.height ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
      console.log('[OrientationContext] Orientation changed:', newOrientation, `(${window.width}x${window.height})`);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Tablet detection: typically tablets have width >= 600px
  // For more accurate detection, we can use 600px as threshold
  const isTablet = dimensions.width >= 600;
  
  // Calculate number of columns based on device type and orientation
  // Phone Portrait: 1 column
  // Phone Landscape: 2 columns
  // Tablet Portrait (810x1080): 2 columns (optimal for 810px width)
  // Tablet Portrait (larger): 3 columns (for width >= 900px)
  // Tablet Landscape (1080x810): 3 columns (optimal for 1080px width)
  // Tablet Landscape (larger): 4 columns (for width >= 1200px)
  const calculateNumColumns = (): number => {
    if (!isTablet) {
      // Phone
      return orientation === 'landscape' ? 2 : 1;
    } else {
      // Tablet
      if (orientation === 'landscape') {
        // Landscape tablet: 3 columns for 1080px, 4 for larger tablets
        // 1080px width: 3 columns = ~340px per card (optimal)
        // 1200px+ width: 4 columns = ~290px per card (still readable)
        if (dimensions.width >= 1200) return 4;
        // Default to 3 columns for 1080px tablets
        return 3;
      } else {
        // Portrait tablet: 2 columns for 810px, 3 for larger tablets
        // 810px width: 2 columns = ~380px per card (optimal)
        // 900px+ width: 3 columns = ~290px per card (still readable)
        if (dimensions.width >= 900) return 3;
        // Default to 2 columns for 810px tablets
        return 2;
      }
    }
  };

  const value: OrientationContextType = {
    orientation,
    screenWidth: dimensions.width,
    screenHeight: dimensions.height,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
    isTablet,
    numColumns: calculateNumColumns(),
  };

  return (
    <OrientationContext.Provider value={value}>
      {children}
    </OrientationContext.Provider>
  );
}

export function useOrientation() {
  const context = useContext(OrientationContext);
  if (context === undefined) {
    throw new Error('useOrientation must be used within an OrientationProvider');
  }
  return context;
}

