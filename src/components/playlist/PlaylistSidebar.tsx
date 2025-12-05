import React, { useRef, useState, useCallback } from 'react';
import { Icon } from '../ui/Icon';

interface PlaylistItem {
  id: string;
  name: string;
  trackCount: number;
}

interface TrackItem {
  id: string;
  name: string;
  duration: string;
  status: 'completed' | 'processing' | 'error';
}

interface PlaylistSidebarProps {
  playlists: PlaylistItem[];
  activePlaylistId: string | null;
  activePlaylist: {
    id: string;
    name: string;
    tracks: TrackItem[];
  } | null;
  looseTrack: TrackItem | null;
  activeTrackId: string | null;
  onPlaylistSelect: (id: string) => void;
  onPlaylistDelete: (id: string) => void;
  onPlaylistRename: (id: string, newName: string) => void;
  onPlaylistCreate: (name: string) => void;
  onTrackSelect: (id: string) => void;
  onTrackDelete: (id: string) => void;
  onMoveTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress?: number;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
}

export const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({
  playlists,
  activePlaylistId,
  activePlaylist,
  looseTrack,
  activeTrackId,
  onPlaylistSelect,
  onPlaylistDelete,
  onPlaylistRename,
  onPlaylistCreate,
  onTrackSelect,
  onTrackDelete,
  onMoveTrackToPlaylist,
  onFileUpload,
  isUploading,
  uploadProgress,
  isOpen,
  onClose,
  isAuthenticated = true,
  onLoginClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        const allowedTypes = [
          'audio/mpeg',
          'audio/wav',
          'audio/aiff',
          'audio/flac',
          'audio/ogg',
          'audio/mp4',
          'audio/x-m4a',
        ];
        const allowedExtensions = ['.mp3', '.wav', '.aiff', '.flac', '.ogg', '.m4a'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();

        if (allowedTypes.includes(file.type) || allowedExtensions.includes(ext)) {
          onFileUpload(file);
        }
      }
    },
    [onFileUpload]
  );

  const handleStartRename = (playlist: PlaylistItem) => {
    setEditingPlaylistId(playlist.id);
    setEditName(playlist.name);
  };

  const handleFinishRename = () => {
    if (editingPlaylistId && editName.trim()) {
      onPlaylistRename(editingPlaylistId, editName.trim());
    }
    setEditingPlaylistId(null);
    setEditName('');
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onPlaylistCreate(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    }
  };

  const handleDeleteConfirm = (playlistId: string) => {
    onPlaylistDelete(playlistId);
    setDeleteConfirmId(null);
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-72 md:w-80 
        flex flex-col h-full bg-background-dark border-r border-white/10 
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white md:hidden"
      >
        <Icon name="close" className="text-xl" />
      </button>

      <div className="flex items-center justify-between gap-3 p-6 md:p-4 md:mb-2 border-b border-white/5 md:border-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Icon name="library_music" className="text-xl text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-base font-medium font-sans">My Playlists</h1>
            <p className="text-white/60 text-sm font-sans">
              {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreatingPlaylist(true)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Create Playlist"
        >
          <Icon name="add" className="text-lg" />
        </button>
      </div>

      {isCreatingPlaylist && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePlaylist();
                if (e.key === 'Escape') {
                  setIsCreatingPlaylist(false);
                  setNewPlaylistName('');
                }
              }}
            />
            <button
              onClick={handleCreatePlaylist}
              className="px-3 py-2 bg-primary hover:bg-blue-600 rounded-lg text-sm text-white transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 flex-1 overflow-hidden px-4 pb-4">
        <button
          onClick={() => setShowPlaylists(!showPlaylists)}
          className="flex items-center gap-2 py-2 text-white/60 hover:text-white transition-colors flex-shrink-0"
        >
          <Icon
            name={showPlaylists ? 'expand_more' : 'chevron_right'}
            className="text-lg"
          />
          <span className="text-xs uppercase tracking-wider font-medium font-sans">
            Playlists
          </span>
        </button>

        {showPlaylists && (
          <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="queue_music" className="text-4xl text-white/20 mb-2" />
                <p className="text-white/40 text-sm font-sans">No playlists yet</p>
                <p className="text-white/30 text-xs font-sans">Create one to get started</p>
              </div>
            ) : (
              playlists.map((playlist) => (
                <div key={playlist.id} className="relative">
                  {deleteConfirmId === playlist.id ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="flex-1 text-sm text-red-400 font-sans">Delete playlist?</p>
                      <button
                        onClick={() => handleDeleteConfirm(playlist.id)}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs text-white transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : editingPlaylistId === playlist.id ? (
                    <div className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white/5 border border-primary rounded px-2 py-1 text-sm text-white focus:outline-none"
                        autoFocus
                        onBlur={handleFinishRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename();
                          if (e.key === 'Escape') {
                            setEditingPlaylistId(null);
                            setEditName('');
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => onPlaylistSelect(playlist.id)}
                      className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors group ${
                        activePlaylistId === playlist.id
                          ? 'bg-primary/20 border border-primary/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Icon
                          name="queue_music"
                          filled={activePlaylistId === playlist.id}
                          className={`text-lg ${
                            activePlaylistId === playlist.id
                              ? 'text-primary'
                              : 'text-white/60'
                          }`}
                        />
                        <div className="flex flex-col overflow-hidden">
                          <p className="text-white text-sm font-medium truncate font-sans">
                            {playlist.name}
                          </p>
                          <p className="text-xs text-white/50 font-sans">
                            {playlist.trackCount} track
                            {playlist.trackCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(playlist);
                          }}
                          className="p-1 text-white/40 hover:text-white transition-colors"
                          title="Rename"
                        >
                          <Icon name="edit" className="text-sm" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(playlist.id);
                          }}
                          className="p-1 text-white/40 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Icon name="delete" className="text-sm" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activePlaylist && activePlaylist.tracks.length > 0 && (
          <div className="flex flex-col flex-1 min-h-0 mt-2">
            <div className="mb-2 flex-shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-white/40 font-sans">
                Tracks in "{activePlaylist.name}"
              </span>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {activePlaylist.tracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onTrackSelect(track.id)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors group ${
                    activeTrackId === track.id
                      ? 'bg-primary/15 border border-primary/20'
                      : 'bg-white/[0.02] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon
                      name="music_note"
                      filled={activeTrackId === track.id}
                      className={`text-lg ${
                        activeTrackId === track.id ? 'text-primary' : 'text-white/50'
                      }`}
                    />
                    <div className="flex flex-col overflow-hidden">
                      <p className="text-white text-sm truncate font-sans">{track.name}</p>
                      <p className="text-xs text-white/40 font-sans">{track.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {track.status === 'completed' && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    )}
                    {track.status === 'processing' && (
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    )}
                    {track.status === 'error' && (
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrackDelete(track.id);
                      }}
                      className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Icon name="close" className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {looseTrack && (
          <div className="flex flex-col flex-1 min-h-0 mt-2">
            <div className="mb-2 flex-shrink-0">
              <span className="text-xs uppercase tracking-wider font-medium text-yellow-400/80 font-sans">
                Unsaved Track
              </span>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-2">
              <div
                onClick={() => onTrackSelect(looseTrack.id)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors group ${
                  activeTrackId === looseTrack.id
                    ? 'bg-primary/15 border border-primary/20'
                    : 'bg-white/[0.02] hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon
                    name="music_note"
                    filled={activeTrackId === looseTrack.id}
                    className={`text-lg ${
                      activeTrackId === looseTrack.id ? 'text-primary' : 'text-white/50'
                    }`}
                  />
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-white text-sm truncate font-sans">{looseTrack.name}</p>
                    <p className="text-xs text-white/40 font-sans">{looseTrack.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {looseTrack.status === 'completed' && (
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  )}
                  {looseTrack.status === 'processing' && (
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  )}
                  {looseTrack.status === 'error' && (
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
              </div>
              
              {playlists.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-500/10">
                  <p className="text-xs text-yellow-400/70 mb-2 font-sans">Move to playlist:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={() => onMoveTrackToPlaylist(looseTrack.id, playlist.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/30 text-xs text-white/70 hover:text-white transition-colors font-sans"
                      >
                        <Icon name="queue_music" className="text-sm" />
                        {playlist.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {playlists.length === 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-500/10">
                  <p className="text-xs text-yellow-400/70 mb-2 font-sans">
                    Create a playlist to save this track
                  </p>
                  <button
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-sans"
                  >
                    <Icon name="add" className="text-sm" />
                    Create Playlist
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-white/5 flex-shrink-0">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
            <Icon name="lock" className="text-4xl md:text-5xl text-white/40" />
            <div>
              <p className="text-sm font-medium text-white/80 font-sans">Sign in required</p>
              <p className="text-xs text-white/50 mt-1 font-sans">
                Sign in to upload and analyze audio files
              </p>
            </div>
            <button
              onClick={onLoginClick}
              className="w-full rounded-md bg-primary hover:bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 text-center transition-all cursor-pointer group
              ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }
              ${isUploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.aiff,.flac,.ogg,.m4a,audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {isUploading ? (
              <>
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
                <div className="w-full">
                  <p className="text-sm font-medium text-white/80 font-sans">Processing audio...</p>
                  <p className="text-xs text-white/50 mt-1 font-sans">Analyzing chords with AI</p>
                  {uploadProgress !== undefined && (
                    <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Icon
                  name={isDragging ? 'file_download' : 'upload_file'}
                  className={`text-4xl md:text-5xl transition-colors ${
                    isDragging
                      ? 'text-primary'
                      : 'text-white/40 group-hover:text-white/60'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-white/80 font-sans">
                    {isDragging ? 'Drop to upload' : 'Drag & Drop Audio Files'}
                  </p>
                  <p className="text-xs text-white/50 mt-1 font-sans">
                    Supports .mp3, .wav, .flac, .aiff, .ogg, .m4a
                  </p>
                </div>
                <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20">
                  Browse Files
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
