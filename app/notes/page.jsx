"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../../styles/pages/notes.css";
import "../../styles/global.css";
import NoteOptions from "../components/notes/note-options";
import FolderOptions from "../components/notes/folder-options";

export default function Notes() {
  const [folders, setFolders] = useState([]);
  const [freeNotes, setFreeNotes] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderNotes, setFolderNotes] = useState({});
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeFolderOptions, setActiveFolderOptions] = useState(null); 
  const [activeNoteOptions, setActiveNoteOptions] = useState(null);
  const [ setError] = useState(null);


  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/notes-page/find/folders", { credentials: "include" });
      if (!response.ok) throw new Error();
      setFolders(await response.json());
    } catch {
      setError("Could not load folders");
    }
  };

  const fetchFreeNotes = async () => {
    try {
      const response = await fetch("/api/notes-page/find/free-notes", { credentials: "include" });
      if (!response.ok) throw new Error();
      setFreeNotes(await response.json());
    } catch {
      setError("Could not load notes");
    }
  };

  const refetch = async () => {
    try {
      await Promise.all([fetchFolders(), fetchFreeNotes()]);

      const openFolderIds = Object.keys(expandedFolders).filter(
        (id) => expandedFolders[id]
      );

      if (openFolderIds.length > 0) {
        const folderResults = await Promise.all(
          openFolderIds.map(async (id) => {
            const response = await fetch(`/api/notes-page/find/notes?folderId=${id}`, {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              return { id, data };
            }
            return null;
          })
        );
        setFolderNotes((prev) => {
          const updatedFolderNotes = { ...prev };
          folderResults.forEach((result) => {
            if (result) {
              updatedFolderNotes[result.id] = result.data;
            }
          });
          return updatedFolderNotes;
        });
      }

    } catch (err) {
      console.error("Refetch failed:", err);
      setError("Failed to sync data");
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchFreeNotes();
  }, []);
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  const previewContext = (content, maxLength = 30) => {
    if (!content) return "";
    return content.length > maxLength ? content.slice(0, maxLength) + "…" : content;
  };
  const noteSelect = (note) => {
    if (selectedNote?.note_id === note.note_id) return;
    setSelectedNote(note); 
  };
  const openFolderOptions = (folder) => {
        setActiveFolderOptions(folder);
  };
  const openNoteOptions = (note) => {
      setActiveNoteOptions(note);
  }
  const closeFolderOptions = () => setActiveFolderOptions(null);
  const closeNoteOptions = () => setActiveNoteOptions(null);

  const toggleFolder = async (folderId) => {
    const isOpening = !expandedFolders[folderId];
    setExpandedFolders((prev) => ({ ...prev, [folderId]: isOpening }));

    if (isOpening) {
        try {
            const response = await fetch(`/api/notes-page/find/notes?folderId=${folderId}`, { credentials: "include" });
            if (!response.ok) throw new Error();
            const data = await response.json();
              
            setFolderNotes((prev) => ({ 
                 ...prev, 
                [folderId]: data 
            }));
        } catch {
            setError("Could not load folder notes");
        }
    }
  };
    const handleCreate = async (type, folderId = null) => {
        try {
        const response = await fetch("/api/notes-page/manage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
            action: "create",
            type,
            data: type === "note"
                ? { folder_id: folderId, title: "New Note", content: "" }
                : { folder_title: "New Folder" },
            }),
        });
        if (!response.ok) throw new Error("Create failed");
        const result = await response.json();

        if (type === "note") {
            const newNote = result.note;
            if (folderId) {
            setFolderNotes((prev) => ({
                ...prev,
                [folderId]: prev[folderId] ? [newNote, ...prev[folderId]] : [newNote],
            }));
            } else {
            setFreeNotes((prev) => [newNote, ...prev]);
            }
        } else {
            setFolders((prev) => [result.folder, ...prev]);
        }
        } catch (err) {
        console.error(err);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedNote) return;
        try {
        const response = await fetch("/api/notes-page/manage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
            action: "update",
            type: "note",
            id: selectedNote.note_id,
            data: {
                title: selectedNote.title,
                content: selectedNote.content,
                colour: selectedNote.colour || null,
                folder_id: selectedNote.folder_id || null,
            },
            }),
        });
        if (!response.ok) throw new Error("Save failed");
        refetch()
        } catch (err) {
        console.error(err);
        }
    };

  return (
  <>
    <Navbar />

    <div className="notes-page">
      <div className="notes-container">
        <div className="notes-banner">
          <h1>Notes</h1>
          <button
            type="button"
            className="folder-create-btn"
            onClick={() => handleCreate("folder")}
          >
            <img src="/new-folder.svg" alt="New folder" />
          </button>
          <button
            type="button"
            className="note-create-btn"
            onClick={() => handleCreate("note")}
          >
            <img src="/new-note.svg" alt="New note" />
          </button>
        </div>
        <div className = "notes-list">
        {folders.map((folder) => (
          <div key={folder.folder_id} className="folder-wrapper">
            <div
              className="folder-section"
              onClick={() => toggleFolder(folder.folder_id)}
            >
              <span className="folder-title">{folder.folder_title}</span>

              <button
                type="button"
                className="folder-settings-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openFolderOptions(folder);
                }}
              >
                <img src="/dots.svg" alt="Options" />
              </button>
            </div>

            {expandedFolders[folder.folder_id] &&
              folderNotes[folder.folder_id]?.map((note) => (
                <div
                  key={note.note_id}
                  className="note-item"
                  onClick={() => noteSelect(note)}
                >
                  <div className="note-top">
                    <span className="note-title">{note.title}</span>
                    <span className="note-time">{formatTimestamp(note.updated_at)}</span>
                  </div>
                  <div className="note-bottom">
                    <span className="note-preview">{previewContext(note.content)}</span>
                    <button
                      type="button"
                      className="note-settings-btn"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        openNoteOptions(note);
                      }}
                    >
                      <img src="/dots.svg" alt="Options" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}

        <div className="free-notes-section">
          {freeNotes.map((note) => (
            <div
              key={note.note_id}
              className="note-item"
              onClick={() => noteSelect(note)}
            >
              <div className="note-top">
                <span className="note-title">{note.title}</span>
                <span className="note-time">{formatTimestamp(note.updated_at)}</span>
              </div>
              <div className="note-bottom">
                <span className="note-preview">{previewContext(note.content)}</span>
                <button
                  type="button"
                  className="note-settings-btn"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    openNoteOptions(note);
                  }}
                >
                  <img src="/dots.svg" alt="Options" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      <div className= "notes-editor">
          <div className="editor-banner">
            <h1>{selectedNote?.title || "Note Editor"}</h1>
            <h2>{formatTimestamp(selectedNote?.updated_at)||" " }</h2>
          </div>
          <textarea className="notes-textarea" placeholder= "select a note..." 
          value={selectedNote?.content || ""} 
          onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })} /> 
        <button type="button" className ="save-button" onClick={handleSaveNote}  disabled={!selectedNote} 
        >Save</button>
        </div>
    </div>

    {activeFolderOptions && (
      <FolderOptions
        folder={activeFolderOptions}
        onClose={closeFolderOptions}
        refetch={refetch}
      />
    )}

    {activeNoteOptions && (
      <NoteOptions
        note={activeNoteOptions}
        folders={folders}
        onClose={closeNoteOptions}
        refetch={refetch}
      />
    )}
  </>
);
}
