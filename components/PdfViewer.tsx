import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomInIcon, ZoomOutIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from './Icons';

declare const pdfjsLib: any;

interface PdfViewerProps {
  url: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setPageNum(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadPdf();
    }
  }, [url]);

  const renderPage = useCallback(async (num: number, currentScale: number) => {
    if (!pdf || !canvasRef.current) return;

    // Cancel previous render task if any
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdf.getPage(num);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
    } catch (error) {
      if (error.name === 'RenderingCancelledException') {
        // Expected if we cancel a render
      } else {
        console.error('Error rendering page:', error);
      }
    }
  }, [pdf]);

  useEffect(() => {
    renderPage(pageNum, scale);
  }, [pageNum, scale, renderPage]);

  const handlePrevPage = () => {
    if (pageNum <= 1) return;
    setPageNum(pageNum - 1);
  };

  const handleNextPage = () => {
    if (pageNum >= numPages) return;
    setPageNum(pageNum + 1);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !pdf) return;

    setLoading(true);
    const results: number[] = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push(i);
      }
    }
    
    setSearchResults(results);
    if (results.length > 0) {
      setCurrentResultIndex(0);
      setPageNum(results[0]);
    } else {
      setCurrentResultIndex(-1);
      alert('لم يتم العثور على نتائج');
    }
    setLoading(false);
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    setPageNum(searchResults[nextIndex]);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    setPageNum(searchResults[prevIndex]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevPage}
            disabled={pageNum <= 1 || loading}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium px-2">
            {pageNum} / {numPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={pageNum >= numPages || loading}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-l border-gray-200 dark:border-gray-700 px-2">
          <button
            onClick={handleZoomOut}
            disabled={loading}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="تصغير"
          >
            <ZoomOutIcon className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={loading}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="تكبير"
          >
            <ZoomInIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-1 flex-grow max-w-xs">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) {
                  setSearchResults([]);
                  setCurrentResultIndex(-1);
                }
              }}
              placeholder="بحث..."
              className="w-full pl-8 pr-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setCurrentResultIndex(-1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                {currentResultIndex + 1} / {searchResults.length}
              </span>
              <button
                type="button"
                onClick={prevSearchResult}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRightIcon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={nextSearchResult}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeftIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Canvas Area */}
      <div className="flex-grow overflow-auto p-4 flex justify-center items-start relative bg-gray-200 dark:bg-gray-950">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-20">
            <LoaderIcon className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}
        <div className="shadow-2xl bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};
