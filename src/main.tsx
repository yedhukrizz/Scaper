import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as THREE from 'three';
import { useStore } from './store';

THREE.DefaultLoadingManager.setURLModifier((url) => {
    const blobMap = useStore.getState().blobMap;
    
    // Extract filename from the requested URL (ignores path/directories)
    const fileNameStr = url.split('/').pop()?.split('?')[0];
    const decodedUrl = decodeURIComponent(url);
    
    if (fileNameStr) {
        const decodedFileName = decodeURIComponent(fileNameStr);
        
        // Exact filename matches
        if (blobMap[fileNameStr]) return blobMap[fileNameStr];
        if (blobMap[decodedFileName]) return blobMap[decodedFileName];
        
        // Case-insensitive fallback
        const lowerFileName = fileNameStr.toLowerCase();
        const lowerDecoded = decodedFileName.toLowerCase();
        for (const key in blobMap) {
            const lowerKey = key.toLowerCase();
            const lowerKeyName = key.split('/').pop()?.toLowerCase() || '';
            if (lowerKey === lowerFileName || lowerKey === lowerDecoded || lowerKeyName === lowerFileName) {
                return blobMap[key];
            }
        }
    }

    if (blobMap[url]) return blobMap[url];
    if (blobMap[decodedUrl]) return blobMap[decodedUrl];

    // If it's a data URI let it pass
    if (url.startsWith('data:')) return url;
    if (url.startsWith('blob:')) return url;

    return url;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
