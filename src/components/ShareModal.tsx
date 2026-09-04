import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Download, Share2 } from 'lucide-react';
import { Product } from '../types';
import { generateQrDataUrl } from '../lib/qr';
import { LogoMark } from './LogoMark';

interface ShareModalProps {
  product: Product;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ product, onClose }) => {
  const [selectedSource, setSelectedSource] = useState<string>('instagram');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/p/${product.slug}?src=${selectedSource}`;

  useEffect(() => {
    generateQrDataUrl(shareUrl, { width: 320 }).then(url => {
      setQrDataUrl(url);
    });
  }, [shareUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${product.slug}-qr-code.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const channels = [
    { id: 'instagram', label: 'Instagram', note: 'Bio & Stories' },
    { id: 'linkedin', label: 'LinkedIn', note: 'Posts & Articles' },
    { id: 'twitter', label: 'Twitter / X', note: 'Threads & DMs' },
    { id: 'youtube', label: 'YouTube', note: 'Descriptions' },
    { id: 'whatsapp', label: 'WhatsApp', note: 'Direct broadcast' },
    { id: 'direct', label: 'Direct', note: 'Standard link' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17181F]/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#FFFFFF] p-6 sm:p-7 shadow-2xl border border-[#E7DFCE] text-[#17181F]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7DFCE] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFE7DD] text-[#FF5A36] border border-[#FF5A36]/20">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#17181F]">Share System & UTM Link</h3>
              <p className="text-xs text-[#6E6C63] truncate max-w-xs">{product.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Target Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#17181F] mb-2">
              Select Promotion Channel (Auto-tags UTM Source)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {channels.map(channel => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedSource(channel.id)}
                  className={`flex flex-col items-start rounded-2xl p-2.5 text-left border transition-all cursor-pointer ${
                    selectedSource === channel.id
                      ? 'border-[#FF5A36] bg-[#FFE7DD] text-[#17181F] shadow-2xs'
                      : 'border-[#E7DFCE] bg-[#FAF6EE] text-[#6E6C63] hover:bg-[#F3EDE0]'
                  }`}
                >
                  <span className="text-xs font-bold">{channel.label}</span>
                  <span className={`text-[10px] ${selectedSource === channel.id ? 'text-[#FF5A36] font-medium' : 'text-[#A6A296]'}`}>
                    {channel.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shareable Link Box */}
          <div>
            <label className="block text-xs font-semibold text-[#17181F] mb-1">
              Tracking URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] px-3.5 py-2 text-xs font-mono text-[#17181F] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF5A36] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#E64A27] transition-all cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Auto-Generated QR Code */}
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-2xs border border-[#E7DFCE]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Product QR Code" className="h-full w-full object-contain" />
              ) : (
                <QrCode className="h-8 w-8 text-[#A6A296]" />
              )}
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <h4 className="font-display text-xs font-bold text-[#17181F]">Direct Scan QR Code</h4>
              <p className="text-xs text-[#6E6C63] leading-relaxed">
                Scan with phone camera to open product landing page with <span className="font-bold text-[#17181F]">{selectedSource}</span> tracking preloaded.
              </p>
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFCE] bg-white px-3 py-1 text-xs font-semibold text-[#17181F] hover:bg-[#F3EDE0] shadow-2xs cursor-pointer"
                >
                  <Download className="h-3 w-3" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-5 py-1.5 text-xs font-semibold text-[#6E6C63] hover:bg-[#F3EDE0] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
