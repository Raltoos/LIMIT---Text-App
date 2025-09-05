import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Save, FolderOpen, Edit3, Trash2, Plus, Search, X } from 'lucide-react';

const App = () => {
  const [value, setValue] = useState('');
  const [limit, setLimit] = useState(500);
  const [shake, setShake] = useState(false);
  const [justHitLimit, setJustHitLimit] = useState(false);
  const [title, setTitle] = useState('');

  const [currentView, setCurrentView] = useState('editor');
  
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [savedFiles, setSavedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const textareaRef = useRef(null);

  const words = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;
  const pct = Math.min((words / limit) * 100, 100);

  // File System Access API check
  const isFileSystemSupported = 'showDirectoryPicker' in window;

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }, []);

  const triggerGlow = useCallback(() => {
    setJustHitLimit(true);
    setTimeout(() => setJustHitLimit(false), 900);
  }, []);

  const onChange = useCallback((e) => {
    const newValue = e.target.value;
    const newWords = newValue.trim() === '' ? 0 : newValue.trim().split(/\s+/).length;
    
    if (newWords <= limit) {
      setValue(newValue);
      if (newWords === limit && words < limit) {
        triggerGlow();
      }
    } else {
      triggerShake();
    }
  }, [limit, words, triggerShake, triggerGlow]);

  const onBeforeInput = useCallback((e) => {
    if (words >= limit && e.inputType === 'insertText') {
      e.preventDefault();
      triggerShake();
    }
  }, [words, limit, triggerShake]);

  const onPaste = useCallback((e) => {
    const pastedText = e.clipboardData.getData('text');
    const currentText = e.target.value;
    const newText = currentText + pastedText;
    const newWords = newText.trim() === '' ? 0 : newText.trim().split(/\s+/).length;
    
    if (newWords > limit) {
      e.preventDefault();
      triggerShake();
    }
  }, [limit, triggerShake]);

  const onChangeLimit = useCallback((newLimit) => {
    const numLimit = parseInt(newLimit) || 1;
    setLimit(Math.max(1, Math.min(10000, numLimit)));
  }, []);

  const selectDirectory = async () => {
    if (!isFileSystemSupported) {
      alert('File System Access API is not supported in your browser. Please use Chrome, Edge, or another Chromium-based browser.');
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      await loadSavedFiles(handle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting directory:', err);
      }
    }
  };

  const loadSavedFiles = async (handle) => {
    if (!handle) return;
    
    setIsLoading(true);
    const files = [];
    
    try {
      for await (const [name, fileHandle] of handle.entries()) {
        if (fileHandle.kind === 'file' && name.endsWith('.txt')) {
          const file = await fileHandle.getFile();
          const content = await file.text();
          const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
          
          files.push({
            name: name.replace('.txt', ''),
            handle: fileHandle,
            content,
            wordCount,
            lastModified: file.lastModified
          });
        }
      }
      
      files.sort((a, b) => b.lastModified - a.lastModified);
      setSavedFiles(files);
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!directoryHandle) {
      await selectDirectory();
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title for your essay');
      return;
    }

    if (!value.trim()) {
      alert('Please write something before saving');
      return;
    }

    try {
      const fileName = `${title.trim()}.txt`;
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(value);
      await writable.close();
      
      // Refresh the file list
      await loadSavedFiles(directoryHandle);
      
      // Clear the editor
      setValue('');
      setTitle('');
      
      alert('Essay saved successfully!');
    } catch (err) {
      console.error('Error saving file:', err);
      alert('Error saving file. Please try again.');
    }
  };

  const loadFile = async (fileData) => {
    setValue(fileData.content);
    setTitle(fileData.name);
    setCurrentView('editor');
  };

  const deleteFile = async (fileData) => {
    if (!confirm(`Are you sure you want to delete "${fileData.name}"?`)) {
      return;
    }

    try {
      await directoryHandle.removeEntry(fileData.name + '.txt');
      await loadSavedFiles(directoryHandle);
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Error deleting file. Please try again.');
    }
  };

  const newFile = () => {
    setValue('');
    setTitle('');
    setCurrentView('editor');
  };

  const filteredFiles = savedFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900 antialiased">
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35); }
          100% { box-shadow: 0 0 0 16px rgba(244, 63, 94, 0); }
        }
        .pulse-glow { animation: pulseGlow 0.9s ease-out; }
      `}</style>

      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                  <Edit3 className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">
                  <span className="text-pink-400 mr-1">LIMIT</span>Editor
                </h1>
              </div>

              {/* Navigation Links */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => setCurrentView('editor')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'editor'
                      ? 'bg-pink-50 text-pink-600 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <Edit3 className="h-4 w-4 inline mr-2" />
                  Editor
                </button>
                <button
                  onClick={() => setCurrentView('library')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'library'
                      ? 'bg-pink-50 text-pink-600 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Library ({savedFiles.length})
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {currentView === 'editor' ? (
                <>
                  <button
                    onClick={saveFile}
                    disabled={!value.trim() || !title.trim()}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-sm font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={newFile}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-blue-600 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </button>
                  <button
                    onClick={selectDirectory}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-all"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Folder</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="sm:hidden pb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentView('editor')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === 'editor'
                    ? 'bg-pink-50 text-pink-600 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Edit3 className="h-4 w-4 inline mr-2" />
                Editor
              </button>
              <button
                onClick={() => setCurrentView('library')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === 'library'
                    ? 'bg-pink-50 text-pink-600 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Library ({savedFiles.length})
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {currentView === 'editor' ? (
          // Editor View
          <div className="mx-auto max-w-5xl p-4 md:p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-2">
                  Essay Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your essay..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500">
                    Type freely until you hit your limit.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="limit" className="text-sm text-zinc-600 whitespace-nowrap">
                    Word limit
                  </label>
                  <input
                    id="limit"
                    type="number"
                    min={1}
                    max={10000}
                    value={limit}
                    onChange={(e) => onChangeLimit(e.target.value)}
                    className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">{words}</span> / {limit} words
                </div>
                <div
                  className={`text-xs ${words >= limit ? "text-rose-600" : "text-zinc-500"}`}
                  aria-live="polite"
                >
                  {words >= limit ? "Limit reached" : `${limit - words} remaining`}
                </div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    words < limit
                      ? "bg-gradient-to-r from-indigo-500 to-blue-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Editor */}
            <div
              className={[
                "rounded-2xl border bg-white/90 backdrop-blur shadow-lg transition-all duration-300",
                "px-0",
                words >= limit ? "border-rose-300" : "border-zinc-200",
                shake ? "animate-shake" : "",
                justHitLimit ? "pulse-glow" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                <div className="flex items-center gap-2 text-zinc-500">
                  {words >= limit ? (
                    <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  {words >= limit ? "Editing locked (delete to continue)" : "Editing enabled"}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onBeforeInput={onBeforeInput}
                onPaste={onPaste}
                placeholder="Start writing your essay..."
                spellCheck={true}
                className={[
                  "w-full resize-y",
                  "min-h-[50vh] md:min-h-[55vh] lg:min-h-[58vh]",
                  "px-4 py-4 outline-none",
                  "bg-transparent",
                  "text-[15px] leading-7",
                  "placeholder:text-zinc-400",
                ].join(" ")}
                aria-label="Word-limited text editor"
              />

              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="text-xs text-zinc-500">
                    Delete to free up words.
                  </div>
                  <button
                    onClick={saveFile}
                    disabled={!value.trim() || !title.trim()}
                    className="sm:hidden flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-xs font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </button>
                </div>
                <div
                  className={[
                    "text-xs font-medium",
                    words >= limit ? "text-rose-600" : "text-emerald-600",
                  ].join(" ")}
                >
                  {words >= limit ? "Limit reached" : "Within limit"}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Counting method: words split on whitespace.
            </p>
          </div>
        ) : (
          // Library View
          <div className="mx-auto max-w-6xl p-4 md:p-8">
            {/* Library Header */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
                Your Essay Library
              </h2>
              <p className="text-zinc-500">
                {directoryHandle ? `Managing essays in your selected folder` : 'Select a folder to start saving your essays'}
              </p>
            </div>

            {!directoryHandle ? (
              // No directory selected
              <div className="text-center py-16">
                <div className="mb-6">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mb-4">
                    <FolderOpen className="h-8 w-8 text-pink-500" />
                  </div>
                  <h3 className="text-lg font-medium text-zinc-900 mb-2">
                    Select Your Essays Folder
                  </h3>
                  <p className="text-zinc-500 max-w-md mx-auto mb-6">
                    Choose a folder on your computer where you'd like to save and manage your essays. 
                    All your work will be stored locally on your device.
                  </p>
                </div>
                
                {isFileSystemSupported ? (
                  <button
                    onClick={selectDirectory}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    <FolderOpen className="h-5 w-5" />
                    Choose Folder
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-amber-800 text-sm">
                      File System Access API is not supported in your browser. 
                      Please use Chrome, Edge, or another Chromium-based browser for the full experience.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Search and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search essays..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={newFile}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-blue-600 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      New Essay
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-pink-500 border-r-transparent"></div>
                    <p className="mt-4 text-zinc-500">Loading your essays...</p>
                  </div>
                ) : (
                  <>
                    {/* Essays Grid */}
                    {filteredFiles.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mb-4">
                          <FileText className="h-12 w-12 text-zinc-300 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 mb-2">
                          {savedFiles.length === 0 ? 'No essays yet' : 'No matching essays'}
                        </h3>
                        <p className="text-zinc-500">
                          {savedFiles.length === 0 
                            ? 'Start writing your first essay to see it here.'
                            : 'Try adjusting your search query.'
                          }
                        </p>
                        {savedFiles.length === 0 && (
                          <button
                            onClick={newFile}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-rose-600 transition-all"
                          >
                            <Plus className="h-4 w-4" />
                            Write Your First Essay
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredFiles.map((file, index) => (
                          <div
                            key={index}
                            className="group relative bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-medium text-zinc-900 line-clamp-2 group-hover:text-pink-600 transition-colors">
                                  {file.name}
                                </h3>
                                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadFile(file);
                                    }}
                                    className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteFile(file);
                                    }}
                                    className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              
                              <div 
                                onClick={() => loadFile(file)}
                                className="cursor-pointer"
                              >
                                <p className="text-sm text-zinc-500 line-clamp-3 mb-4 leading-relaxed">
                                  {file.content.substring(0, 150)}
                                  {file.content.length > 150 && '...'}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-zinc-400">
                                  <span>{file.wordCount} words</span>
                                  <span>
                                    {new Date(file.lastModified).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Stats */}
                    {savedFiles.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-zinc-200">
                        <div className="text-center text-sm text-zinc-500">
                          {savedFiles.length} {savedFiles.length === 1 ? 'essay' : 'essays'} • {' '}
                          {savedFiles.reduce((total, file) => total + file.wordCount, 0)} total words
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;