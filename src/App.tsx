/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Viewer } from './components/Viewer';
import { DropZone } from './components/DropZone';
import { UIOverlay } from './components/UIOverlay';
import { MobileControlsOverlay } from './components/MobileControlsOverlay';

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-950 font-sans text-gray-900 antialiased selection:bg-blue-200">
      <DropZone />
      <Viewer />
      <UIOverlay />
      <MobileControlsOverlay />
    </div>
  );
}
