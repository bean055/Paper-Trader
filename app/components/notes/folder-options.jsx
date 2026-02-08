"use client";

import { useState } from "react";
import "../../../styles/pages/options.css";

export default function FolderOptions({ folder, onClose, refetch}) {
  const [title, setTitle] = useState(folder.folder_title);

  const handleRename = async () => {
    if (!title.trim()) return;
    try {
      await fetch("/api/notes-page/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update",
          type: "folder",
          id: folder.folder_id,
          data: { folder_title: title },
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
          type: "folder",
          id: folder.folder_id,
        }),
      });
      refetch?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="options-backdrop" onClick={onClose} />

      <div className="options-window">
        <h3>Folder options</h3>

        <label>
          Rename folder
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="options-actions">
          <button className="rename-btn" onClick={handleRename} disabled={!title.trim()}>
            Rename
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
