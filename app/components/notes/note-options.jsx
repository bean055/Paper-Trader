"use client";

import { useState } from "react";
import "../../../styles/pages/options.css";

export default function NoteOptions({ note,folders, onClose, refetch }) {
  const [title, setTitle] = useState(note.title);
  const [targetFolderId, setTargetFolderId] = useState(note.folder_id ?? "");

  const handleRename = async () => {
    if (!title.trim()) return;
    try {
      await fetch("/api/notes-page/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update",
          type: "note",
          id: note.note_id,
          data: { title, folder_id: targetFolderId },
        }),
      });
      refetch?.();
      onClose();
    } catch (err) {
    }
  };
  
  const handleDelete = async () => {
    try {
      await fetch("/api/notes-page/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "delete",
          type: "note",
          id: note.note_id,
        }),
      });
      refetch?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async () => {
    try{
      await fetch("/api/notes-page/manage",{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "move",
          type: "note",
          id: note.note_id,
          data: {title: title, folder_id: targetFolderId } 
        })
      });
      refetch?.();
      onClose();}
      catch (err){console.error(err)}};

  return (
    <>
      <div className="options-backdrop" onClick={onClose} />

      <div className="options-window">
        <h3>Note options</h3>

        <label>
          Rename note
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label>
          Move to folder
          <select
            value={targetFolderId}
            onChange={(e) => setTargetFolderId(e.target.value)}
          >
            <option value="">No folder</option>

            {folders.map((folder) => (
              <option key={folder.folder_id} value={folder.folder_id}>
                {folder.folder_title}
              </option>
            ))}
          </select>
        </label>


        <div className="options-actions">
          <button
            className="rename-btn"
            onClick={handleRename}
            disabled={!title.trim()}
          >
            Rename
          </button>

          <button className="move-btn" onClick={handleMove}>
            Move
          </button>

          <button className="delete-btn" onClick={handleDelete}>
            Delete
          </button>
        </div>

        <button className="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}