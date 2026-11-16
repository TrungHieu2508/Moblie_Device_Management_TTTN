import React, { memo, useEffect, useRef, useState } from 'react';
import { Button, Card, Modal, Tag, Typography } from 'antd';
import {
  ExpandOutlined,
  MobileOutlined,
  StopOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import type { ScreenFrameListener } from '../../../hooks/useWebSocket';

const { Text } = Typography;

interface LiveScreenViewerProps {
  isConnected: boolean;
  subscribeScreenFrame: (listener: ScreenFrameListener) => () => void;
  currentApp?: any;
  initialCurrentApp?: any;
  deviceLabel?: string;
  onSendCommand: (commandType: string, payload?: any) => void;
}

export const LiveScreenViewer: React.FC<LiveScreenViewerProps> = memo(
  ({
    isConnected,
    subscribeScreenFrame,
    currentApp,
    initialCurrentApp,
    deviceLabel,
    onSendCommand,
  }) => {
    const [hasStream, setHasStream] = useState(false);
    const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);
    const hasStreamRef = useRef(false);
    const latestFrameRef = useRef<string | null>(null);
    const mainImgRef = useRef<HTMLImageElement | null>(null);
    const modalImgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
      const unsubscribe = subscribeScreenFrame((frame) => {
        latestFrameRef.current = frame;
        if (frame) {
          const dataUri = `data:image/jpeg;base64,${frame}`;
          if (mainImgRef.current) {
            mainImgRef.current.src = dataUri;
          }
          if (modalImgRef.current) {
            modalImgRef.current.src = dataUri;
          }
          if (!hasStreamRef.current) {
            hasStreamRef.current = true;
            setHasStream(true);
          }
        } else {
          if (mainImgRef.current) {
            mainImgRef.current.removeAttribute('src');
          }
          if (modalImgRef.current) {
            modalImgRef.current.removeAttribute('src');
          }
          if (hasStreamRef.current) {
            hasStreamRef.current = false;
            setHasStream(false);
          }
        }
      });

      return unsubscribe;
    }, [subscribeScreenFrame]);

    // Khi vừa mở trạng thái hasStream hoặc mở Modal phóng to, gán ngay frame cuối vào thẻ <img>
    useEffect(() => {
      if (hasStream && latestFrameRef.current) {
        const dataUri = `data:image/jpeg;base64,${latestFrameRef.current}`;
        if (mainImgRef.current) {
          mainImgRef.current.src = dataUri;
        }
        if (isFullscreenVisible && modalImgRef.current) {
          modalImgRef.current.src = dataUri;
        }
      }
    }, [hasStream, isFullscreenVisible]);

    const activeApp = currentApp || initialCurrentApp;
    const appIconBase64 = activeApp?.appIconBase64;
    const appTitle = activeApp?.appName || activeApp?.packageName;

    return (
      <>
        <Card
          className="bg-[#16171d] border-[#2e303a] rounded-xl shadow-lg"
          title={
            <div className="flex items-center justify-between">
              <span className="text-gray-200 font-semibold flex items-center gap-2">
                <VideoCameraOutlined className="text-cyan-400" /> Xem Màn Hình Trực Tiếp (Real-time Live Stream)
              </span>
              {hasStream && (
                <div className="flex items-center gap-2">
                  <Tag color="error" className="animate-pulse font-bold m-0">
                    ● LIVE STREAM
                  </Tag>
                  <Button
                    size="small"
                    icon={<ExpandOutlined />}
                    className="bg-[#252834] text-gray-200 border-[#3a3d4a] hover:text-cyan-400"
                    onClick={() => setIsFullscreenVisible(true)}
                  >
                    Phóng to
                  </Button>
                </div>
              )}
            </div>
          }
        >
          {/* Khung hiển thị màn hình trực tiếp — cập nhật trực tiếp qua DOM ref để đạt 0 re-render */}
          <div
            className={`bg-black/70 border border-dashed border-[#2e303a] ${
              hasStream ? 'h-[520px]' : 'h-56'
            } flex flex-col items-center justify-center rounded-lg overflow-hidden relative`}
          >
            <img
              ref={mainImgRef}
              alt="Live Screen"
              decoding="sync"
              draggable={false}
              onClick={() => setIsFullscreenVisible(true)}
              style={{ display: hasStream ? 'block' : 'none' }}
              className="max-h-full max-w-full object-contain rounded cursor-pointer select-none"
            />
            {!hasStream && (
              <>
                <MobileOutlined className="text-6xl text-[var(--color-primary)] mb-3" />
                <Text className="text-gray-300 mb-1 font-medium">
                  {isConnected
                    ? 'Thiết bị đang trực tuyến — Nhấn "Xem màn hình (Stream)" để phát trực tiếp'
                    : 'Màn hình hiện đang tắt / Mất kết nối'}
                </Text>
                <Text className="text-gray-500 text-xs">
                  Hình ảnh màn hình điện thoại sẽ truyền trực tiếp theo thời gian thực qua WebSocket
                </Text>
              </>
            )}
          </div>

          {/* Thanh trạng thái ứng dụng đang mở & nút điều khiển Stream */}
          <div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t border-[#2e303a]">
            {appTitle ? (
              <div className="flex items-center gap-3">
                {appIconBase64 && (
                  <img
                    src={`data:image/png;base64,${appIconBase64}`}
                    alt="App Icon"
                    className="w-10 h-10 rounded-lg border border-[#2e303a]"
                  />
                )}
                <Tag color="cyan" className="px-4 py-1.5 text-sm border border-cyan-500/30 rounded-lg m-0">
                  Đang mở ứng dụng: <span className="font-bold text-white">{appTitle}</span>
                </Tag>
              </div>
            ) : (
              <Tag color="default" className="px-4 py-1.5 text-sm border-0 rounded-lg text-gray-400 m-0">
                Chưa xác định ứng dụng đang mở
              </Tag>
            )}

            <div className="flex flex-wrap justify-center gap-3 mt-1">
              <Button
                type="primary"
                icon={<VideoCameraOutlined />}
                className="bg-cyan-600 hover:bg-cyan-500 border-none text-white font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                onClick={() => onSendCommand('START_STREAM')}
              >
                Xem màn hình (Stream)
              </Button>
              <Button
                icon={<StopOutlined />}
                className="bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500 hover:text-white"
                onClick={() => onSendCommand('STOP_STREAM')}
              >
                Dừng Stream
              </Button>
              <Button
                className="bg-[var(--color-primary)]/20 border-[var(--color-primary)]/40 text-purple-300 hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                onClick={() => onSendCommand('FORCE_HEARTBEAT')}
              >
                Làm mới thông tin Ứng dụng
              </Button>
            </div>
          </div>
        </Card>

        {/* Modal Phóng to màn hình trực tiếp */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <VideoCameraOutlined className="text-cyan-400" />
              <span>Màn Hình Trực Tiếp — {deviceLabel}</span>
              {hasStream && (
                <Tag color="error" className="animate-pulse ml-2">
                  ● LIVE
                </Tag>
              )}
            </div>
          }
          open={isFullscreenVisible}
          onCancel={() => setIsFullscreenVisible(false)}
          footer={[
            <Button
              key="stop"
              danger
              icon={<StopOutlined />}
              onClick={() => {
                onSendCommand('STOP_STREAM');
                setIsFullscreenVisible(false);
              }}
            >
              Dừng Stream
            </Button>,
            <Button key="close" onClick={() => setIsFullscreenVisible(false)}>
              Đóng
            </Button>,
          ]}
          width={520}
          centered
        >
          <div className="bg-black rounded-xl p-2 flex items-center justify-center min-h-[620px]">
            <img
              ref={modalImgRef}
              alt="Live Screen Full"
              decoding="sync"
              draggable={false}
              style={{ display: hasStream ? 'block' : 'none' }}
              className="max-h-[75vh] w-auto object-contain rounded-lg select-none"
            />
            {!hasStream && <Text className="text-gray-400">Đã dừng truyền màn hình</Text>}
          </div>
        </Modal>
      </>
    );
  }
);
