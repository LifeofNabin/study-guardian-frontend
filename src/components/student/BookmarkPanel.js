import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BookmarkPanel = ({ sessionId, materialId, currentPage, onPageChange, isOpen, onClose }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, recent, important
  const [sortBy, setSortBy] = useState('page'); // page, date, name

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchBookmarks();
    }
  }, [isOpen, sessionId]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/bookmarks/session/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setBookmarks(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBookmark = async () => {
    if (!newBookmarkName.trim()) {
      alert('Please enter a bookmark name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/bookmarks`,
        {
          session_id: sessionId,
          material_id: materialId,
          page_number: currentPage,
          name: newBookmarkName.trim(),
          is_important: false
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setBookmarks([...bookmarks, response.data.data]);
        setNewBookmarkName('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
      alert('Failed to add bookmark');
    }
  };

  const deleteBookmark = async (bookmarkId) => {
    if (!window.confirm('Delete this bookmark?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/bookmarks/${bookmarkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBookmarks(bookmarks.filter(b => b._id !== bookmarkId));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      alert('Failed to delete bookmark');
    }
  };

  const toggleImportant = async (bookmark) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/bookmarks/${bookmark._id}`,
        {
          is_important: !bookmark.is_important
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setBookmarks(bookmarks.map(b => 
          b._id === bookmark._id ? response.data.data : b
        ));
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
    }
  };

  const updateBookmarkName = async (bookmarkId, newName) => {
    if (!newName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/bookmarks/${bookmarkId}`,
        {
          name: newName.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setBookmarks(bookmarks.map(b => 
          b._id === bookmarkId ? response.data.data : b
        ));
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
    }
  };

  const jumpToBookmark = (bookmark) => {
    if (onPageChange) {
      onPageChange(bookmark.page_number);
    }
  };

  const getFilteredBookmarks = () => {
    let filtered = [...bookmarks];

    // Apply filter
    if (filter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter(b => new Date(b.createdAt) >= oneWeekAgo);
    } else if (filter === 'important') {
      filtered = filtered.filter(b => b.is_important);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'page':
          return a.page_number - b.page_number;
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const exportBookmarks = () => {
    const data = bookmarks.map(b => ({
      name: b.name,
      page: b.page_number,
      important: b.is_important,
      date: new Date(b.createdAt).toLocaleString()
    }));

    const csv = [
      ['Name', 'Page', 'Important', 'Date'],
      ...data.map(d => [d.name, d.page, d.important ? 'Yes' : 'No', d.date])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmarks_${Date.now()}.csv`;
    link.click();
  };

  if (!isOpen) return null;

  const filteredBookmarks = getFilteredBookmarks();

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔖</span>
          <h2 className="text-xl font-bold">Bookmarks</h2>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Add Bookmark Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>➕</span>
          <span>Add Bookmark</span>
        </button>

        {/* Add Bookmark Form */}
        {showAddForm && (
          <div className="bg-purple-50 rounded-lg p-3 space-y-2">
            <input
              type="text"
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              placeholder={`Bookmark for page ${currentPage}`}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') addBookmark();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={addBookmark}
                className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewBookmarkName('');
                }}
                className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter and Sort */}
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Bookmarks</option>
            <option value="recent">Recent (7 days)</option>
            <option value="important">Important</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="page">By Page</option>
            <option value="date">By Date</option>
            <option value="name">By Name</option>
          </select>
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-sm">No bookmarks yet</p>
            <p className="text-xs mt-2">Add bookmarks to important pages</p>
          </div>
        ) : (
          filteredBookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark._id}
              bookmark={bookmark}
              currentPage={currentPage}
              onJump={jumpToBookmark}
              onDelete={deleteBookmark}
              onToggleImportant={toggleImportant}
              onUpdateName={updateBookmarkName}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
          </span>
          {bookmarks.length > 0 && (
            <button
              onClick={exportBookmarks}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              📥 Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Bookmark Item Component
const BookmarkItem = ({ bookmark, currentPage, onJump, onDelete, onToggleImportant, onUpdateName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(bookmark.name);
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = () => {
    if (editName.trim() && editName !== bookmark.name) {
      onUpdateName(bookmark._id, editName);
    }
    setIsEditing(false);
  };

  const isCurrentPage = bookmark.page_number === currentPage;

  return (
    <div
      className={`relative group bg-white border-2 rounded-lg p-3 transition-all hover:shadow-md ${
        isCurrentPage ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
      }`}
    >
      {/* Page Number Badge */}
      <div className="absolute -top-2 -left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
        Page {bookmark.page_number}
      </div>

      {/* Important Star */}
      <button
        onClick={() => onToggleImportant(bookmark)}
        className={`absolute -top-2 -right-2 text-2xl transition-transform hover:scale-110 ${
          bookmark.is_important ? 'opacity-100' : 'opacity-30 hover:opacity-60'
        }`}
      >
        {bookmark.is_important ? '⭐' : '☆'}
      </button>

      {/* Content */}
      <div className="mt-4">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(bookmark.name);
                }}
                className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900 mb-1 pr-8 break-words">
              {bookmark.name}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {new Date(bookmark.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onJump(bookmark)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isCurrentPage
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                {isCurrentPage ? '📍 Current' : '🔗 Go to page'}
              </button>

              {/* More Options Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  ⋯
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>✏️</span>
                        <span>Edit name</span>
                      </button>
                      <button
                        onClick={() => {
                          onToggleImportant(bookmark);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>{bookmark.is_important ? '☆' : '⭐'}</span>
                        <span>{bookmark.is_important ? 'Unmark' : 'Mark important'}</span>
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          onDelete(bookmark._id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <span>🗑️</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Current Page Indicator */}
      {isCurrentPage && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none animate-pulse"></div>
      )}
    </div>
  );
};

export default BookmarkPanel;