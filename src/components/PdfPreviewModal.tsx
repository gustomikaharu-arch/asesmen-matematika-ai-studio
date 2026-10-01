import React, { useEffect, useState } from 'react';
import { X, Download, Printer, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';

interface PdfPreviewModalProps {
  pdfDoc: jsPDF;
  title: string;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  pdfDoc,
  title,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    try {
      const blob = pdfDoc.output('blob');
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Error generating PDF preview URL:', err);
    }
  }, [pdfDoc]);

  const handleDownload = () => {
    pdfDoc.save(`${title.replace(/[\s\W]+/g, '_')}.pdf`);
  };

  const handlePrint = () => {
    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl h-[92vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="truncate">
            <h3 className="font-extrabold text-sm sm:text-base truncate">
              {title}
            </h3>
            <p className="text-[11px] text-slate-400">
              Pratinjau Dokumen PDF Resmi SDN 11 Anggrek
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Cetak Dokumen"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Iframe */}
        <div className="flex-1 bg-slate-100 relative">
          {blobUrl ? (
            <iframe
              src={`${blobUrl}#toolbar=0`}
              title="PDF Preview"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
              Menyiapkan Pratinjau Dokumen PDF...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
