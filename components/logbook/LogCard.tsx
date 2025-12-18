"use client";

import { useState } from "react";
import { StageChip } from "./StageChip";

interface LogCardProps {
  log: any;
  dayNumber: number;
  weekNumber: number;
  growStartDate: string;
  onEdit: (log: any) => void;
  onDelete: (logId: string) => void;
  deletingLogId: string | null;
}

export function LogCard({ log, dayNumber, weekNumber, growStartDate, onEdit, onDelete, deletingLogId }: LogCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [fullPhotoIndex, setFullPhotoIndex] = useState(0);

  // Get photos array (new format) or fallback to photo_url (legacy)
  const photos = log.photos && log.photos.length > 0 
    ? log.photos 
    : log.photo_url 
      ? [{ url: log.photo_url, id: 'legacy' }]
      : [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <>
      <div
        style={{
          position: "relative",
          marginBottom: 24,
          paddingLeft: 32,
        }}
      >
        {/* Timeline dot */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#34d399",
            border: "3px solid #000",
            zIndex: 1,
          }}
        />

        {/* Log card */}
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: "1px solid #333",
            background: "#111",
            transition: "all 0.2s",
          }}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <StageChip stage={log.stage} />
                <span style={{ 
                  fontSize: 12, 
                  fontWeight: 600,
                  color: "#34d399",
                  background: "#0a1a0a",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}>
                  Day {dayNumber}
                </span>
                {weekNumber > 0 && (
                  <span style={{ 
                    fontSize: 11, 
                    opacity: 0.6,
                    color: "#999",
                  }}>
                    Week {weekNumber}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ opacity: 0.7, fontSize: 12 }}>
                  {formatDate(log.created_at)}
                </span>
                <span style={{ opacity: 0.5, fontSize: 11 }}>
                  {new Date(log.created_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            
            {/* Actions menu */}
            {showActions && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => onEdit(log)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #444",
                    background: "transparent",
                    color: "#999",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#34d399";
                    e.currentTarget.style.color = "#34d399";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#444";
                    e.currentTarget.style.color = "#999";
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onDelete(log.id)}
                  disabled={deletingLogId === log.id}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #444",
                    background: "transparent",
                    color: "#f87171",
                    fontSize: 12,
                    cursor: deletingLogId === log.id ? "not-allowed" : "pointer",
                    opacity: deletingLogId === log.id ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (deletingLogId !== log.id) {
                      e.currentTarget.style.borderColor = "#f87171";
                      e.currentTarget.style.background = "#3f1f1f";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#444";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {deletingLogId === log.id ? "Deleting..." : "🗑️ Delete"}
                </button>
              </div>
            )}
          </div>

          {/* Note content */}
          <div style={{ 
            marginTop: 8, 
            lineHeight: 1.7, 
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}>
            {log.note}
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {photos.length === 1 ? (
                // Single photo - full width
                <img
                  src={photos[0].url}
                  alt="Log photo"
                  onClick={() => {
                    setFullPhotoIndex(0);
                    setShowFullPhoto(true);
                  }}
                  style={{
                    borderRadius: 12,
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "cover",
                    border: "1px solid #333",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                // Multiple photos - thumbnail grid
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {photos.slice(0, 4).map((photo: any, index: number) => (
                    <div key={photo.id || index} style={{ position: "relative" }}>
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        onClick={() => {
                          setFullPhotoIndex(index);
                          setShowFullPhoto(true);
                        }}
                        style={{
                          borderRadius: 8,
                          width: "100%",
                          height: 150,
                          objectFit: "cover",
                          border: "1px solid #333",
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      {index === 3 && photos.length > 4 && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(0, 0, 0, 0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            fontSize: 18,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setFullPhotoIndex(0);
                            setShowFullPhoto(true);
                          }}
                        >
                          +{photos.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coach button */}
          <div style={{ marginTop: 12 }}>
            <a
              href={`/garden/grow-coach?stage=${log.stage}&note=${encodeURIComponent(log.note)}${log.photo_url ? '&photo=1' : ''}&grow_id=${log.grow_id}`}
              style={{
                display: "inline-block",
              }}
            >
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid #333",
                  fontWeight: 600,
                  fontSize: 14,
                  background: "#1a1a1a",
                  color: "#34d399",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#34d399";
                  e.currentTarget.style.background = "#1a2e1a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.background = "#1a1a1a";
                }}
              >
                🧠 Coach this entry
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen photo viewer */}
      {showFullPhoto && photos.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.95)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowFullPhoto(false)}
        >
          <button
            onClick={() => setShowFullPhoto(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              padding: "12px 20px",
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              zIndex: 2001,
            }}
          >
            ✕ Close
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFullPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                }}
                style={{
                  position: "absolute",
                  left: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "12px 20px",
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 700,
                  zIndex: 2001,
                }}
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFullPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                }}
                style={{
                  position: "absolute",
                  right: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "12px 20px",
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 700,
                  zIndex: 2001,
                }}
              >
                ›
              </button>
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "8px 16px",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "#fff",
                  borderRadius: 8,
                  fontSize: 14,
                  zIndex: 2001,
                }}
              >
                {fullPhotoIndex + 1} / {photos.length}
              </div>
            </>
          )}

          <img
            src={photos[fullPhotoIndex]?.url}
            alt={`Photo ${fullPhotoIndex + 1}`}
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
