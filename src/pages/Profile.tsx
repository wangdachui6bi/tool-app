import { useState } from "react";
import {
  Wrench,
  Database,
  Trash2,
  ChevronRight,
  Download,
} from "lucide-react";
import localforage from "localforage";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { FileOpener } from "@capacitor-community/file-opener";
import { getAllEvents, addEvent, generateId } from "../stores/eventStore";
import type { MemorialEvent } from "../types";
import "./Profile.css";

const APP_VERSION = "1.0.5";
// { "version": "1.0.6", "url": "https://example.com/app-release.apk", "changelog": "更新说明" }
const UPDATE_CHECK_URL = "https://your-server.com/version.json";

interface UpdateInfo {
  version: string;
  url: string;
  changelog: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export default function Profile() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState("");
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(-1);

  const handleExport = async () => {
    const events = await getAllEvents();
    const json = JSON.stringify(events, null, 2);
    const fileName = `tool-app-backup-${new Date().toISOString().split("T")[0]}.json`;
    if (Capacitor.isNativePlatform()) {
      try {
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Cache,
        });
        await Share.share({
          title: "导出数据备份",
          url: uri,
        });
        flashSuccess("导出成功");
      } catch (e: any) {
        if (e?.message?.includes("cancel")) return;
        flashSuccess("导出失败");
      }
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as MemorialEvent[];
        if (!Array.isArray(data)) throw new Error("Invalid format");
        for (const event of data) {
          event.id = generateId();
          await addEvent(event);
        }
        window.dispatchEvent(new Event("eventUpdated"));
        flashSuccess(`成功导入 ${data.length} 条记录`);
      } catch {
        flashSuccess("导入失败：文件格式错误");
      }
    };
    input.click();
  };

  const handleCheckUpdate = async () => {
    try {
      setUpdateChecking(true);
      const res = await fetch(UPDATE_CHECK_URL, { cache: "no-store" });
      const data: UpdateInfo = await res.json();
      if (compareVersions(data.version, APP_VERSION) > 0) {
        setUpdateInfo(data);
        setShowUpdateDialog(true);
      } else {
        flashSuccess("已是最新版本");
      }
    } catch {
      flashSuccess("检查更新失败");
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;
    try {
      setDownloadProgress(0);
      const listener = await Filesystem.addListener("progress", (p) => {
        if (p.contentLength > 0) {
          setDownloadProgress(
            Math.round((p.bytes / p.contentLength) * 100),
          );
        }
      });

      const result = await Filesystem.downloadFile({
        url: updateInfo.url,
        path: "update.apk",
        directory: Directory.Cache,
        progress: true,
      });

      listener.remove();
      setDownloadProgress(100);

      if (result.path) {
        await FileOpener.open({
          filePath: result.path,
          contentType: "application/vnd.android.package-archive",
          openWithDefault: true,
        });
      }

      setShowUpdateDialog(false);
      setDownloadProgress(-1);
    } catch {
      setDownloadProgress(-1);
      flashSuccess("下载失败，请重试");
    }
  };

  const handleClear = async () => {
    await localforage.clear();
    window.dispatchEvent(new Event("eventUpdated"));
    setShowConfirm(false);
    flashSuccess("数据已清除");
  };

  const flashSuccess = (msg: string) => {
    setShowSuccess(msg);
    setTimeout(() => setShowSuccess(""), 2000);
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="profile-header">
          <div className="profile-icon-wrap">
            <Wrench size={32} color="var(--primary)" />
          </div>
          <h1 className="profile-app-name">工具集</h1>
          <span className="profile-version">v{APP_VERSION}</span>
        </div>

        <div className="profile-section fade-in">
          <div className="profile-section-title">数据管理</div>
          <div className="profile-card">
            <button className="profile-item" onClick={handleExport}>
              <Database size={20} className="profile-item-icon" />
              <span className="profile-item-label">导出数据</span>
              <ChevronRight size={18} className="profile-item-arrow" />
            </button>
            <button className="profile-item" onClick={handleImport}>
              <Database size={20} className="profile-item-icon" />
              <span className="profile-item-label">导入数据</span>
              <ChevronRight size={18} className="profile-item-arrow" />
            </button>
            <button
              className="profile-item danger"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 size={20} className="profile-item-icon" />
              <span className="profile-item-label">清除所有数据</span>
              <ChevronRight size={18} className="profile-item-arrow" />
            </button>
          </div>
        </div>

        {Capacitor.getPlatform() === "android" && (
          <div className="profile-section fade-in">
            <div className="profile-section-title">系统</div>
            <div className="profile-card">
              <button
                className="profile-item"
                onClick={handleCheckUpdate}
                disabled={updateChecking}
              >
                <Download size={20} className="profile-item-icon" />
                <span className="profile-item-label">
                  {updateChecking ? "检查中..." : "检查更新"}
                </span>
                <span className="profile-item-meta">v{APP_VERSION}</span>
                <ChevronRight size={18} className="profile-item-arrow" />
              </button>
            </div>
          </div>
        )}

        <div className="profile-footer">
          <p>Made with ❤️</p>
        </div>

        {showSuccess && <div className="toast">{showSuccess}</div>}

        {showUpdateDialog && updateInfo && (
          <div
            className="confirm-overlay"
            onClick={() => downloadProgress < 0 && setShowUpdateDialog(false)}
          >
            <div
              className="confirm-dialog update-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-title">发现新版本</div>
              <div className="confirm-message">
                <div className="update-version">v{updateInfo.version}</div>
                <div className="update-changelog">{updateInfo.changelog}</div>
                {downloadProgress >= 0 && (
                  <div className="update-progress">
                    <div className="update-progress-bar">
                      <div
                        className="update-progress-fill"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <span className="update-progress-text">
                      {downloadProgress}%
                    </span>
                  </div>
                )}
              </div>
              <div className="confirm-buttons">
                {downloadProgress < 0 ? (
                  <>
                    <button
                      className="confirm-cancel"
                      onClick={() => setShowUpdateDialog(false)}
                    >
                      稍后再说
                    </button>
                    <button
                      className="confirm-update"
                      onClick={handleDownloadUpdate}
                    >
                      立即更新
                    </button>
                  </>
                ) : (
                  <button className="confirm-cancel" disabled>
                    下载中...
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showConfirm && (
          <div
            className="confirm-overlay"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="confirm-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-title">确认清除</div>
              <div className="confirm-message">
                确定要清除所有数据吗？此操作不可恢复。
              </div>
              <div className="confirm-buttons">
                <button
                  className="confirm-cancel"
                  onClick={() => setShowConfirm(false)}
                >
                  取消
                </button>
                <button className="confirm-delete" onClick={handleClear}>
                  清除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
