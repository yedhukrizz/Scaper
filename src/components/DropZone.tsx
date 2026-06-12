import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { Upload, FileWarning, Move3d } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function DropZone() {
  const setFile = useStore((state) => state.setFile);
  const fileUrl = useStore((state) => state.fileUrl);
  const [isHovering, setIsHovering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsHovering(false);
      setErrorMsg(null);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [setFile]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMsg(null);
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [setFile]
  );

  const handleFiles = (filesList: FileList | File[]) => {
      const files = Array.from(filesList);
      
      let mainFile: File | null = null;
      let hasSkp = false;
      const newBlobMap: Record<string, string> = {};

      for (const file of files) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'skp') hasSkp = true;
          if (!mainFile && (ext === 'dae' || ext === 'glb' || ext === 'gltf')) {
              mainFile = file;
          }
          const url = URL.createObjectURL(file);
          newBlobMap[file.name] = url;
          if (file.webkitRelativePath) {
              newBlobMap[file.webkitRelativePath] = url;
          }
      }

      if (hasSkp && !mainFile) {
          setErrorMsg('SketchUp (.skp) files are unsupported directly. Please export as .glb (which automatically embeds textures) or .dae and upload it here!');
          Object.values(newBlobMap).forEach(url => URL.revokeObjectURL(url));
          return;
      }

      if (mainFile) {
          const url = newBlobMap[mainFile.name];
          setFile(url, mainFile.name, newBlobMap);
      } else {
          setErrorMsg('Unsupported file format. Please upload a .dae (Collada), .glb, or .gltf file.');
          Object.values(newBlobMap).forEach(url => URL.revokeObjectURL(url));
      }
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(false);
  }, []);

  if (fileUrl) return null; // Hide if a file is already loaded

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
      <div 
        className={cn(
            "relative flex w-full max-w-2xl flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center transition-colors duration-200",
            isHovering ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-800",
            errorMsg ? "border-red-500 bg-red-50/50 dark:border-red-400 dark:bg-red-900/20" : ""
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
           <Move3d className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Upload your 3D Model
        </h2>
        
        <p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
            Drag and drop your model <strong>along with all texture files</strong> here, or click to multi-select them.
            <br/><br/>
            <span className="text-sm"><strong>Tip:</strong> Generating a <strong className="font-semibold text-gray-700 dark:text-gray-300">.glb</strong> export from SketchUp automatically embeds all textures perfectly into a single file!</span>
        </p>

        {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-100 p-4 text-left text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
                <FileWarning className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{errorMsg}</p>
            </div>
        )}

        <label className="relative cursor-pointer rounded-full bg-blue-600 px-8 py-3.5 font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow active:scale-95">
          <span>Select Files</span>
          <input
            type="file"
            className="hidden"
            accept=".dae,.glb,.gltf,.bin,.png,.jpg,.jpeg,.skp"
            multiple
            onChange={onChange}
          />
        </label>
      </div>
    </div>
  );
}
