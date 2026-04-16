import { useRef } from 'react';

interface UploadFallbackProps {
  onFile: (base64: string) => void;
}

export function UploadFallback({ onFile }: UploadFallbackProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:image\/[^;]+;base64,/, '');
      onFile(base64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">Camera not available. Upload a photo instead.</p>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm active:scale-[0.98] transition-transform"
      >
        Choose Photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
