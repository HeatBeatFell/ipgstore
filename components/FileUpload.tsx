import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  type: "cost" | "order";
  onFileUploaded: (file: File) => void;
  isProcessing?: boolean;
}

// 定义组件实例上的方法
export interface FileUploadRef {
  resetFileName: () => void;
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(function FileUpload(
  { type, onFileUploaded, isProcessing = false }, 
  ref
) {
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    resetFileName: () => {
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }));
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setUploading(true);
    
    // 模拟上传进度
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploading(false);
        onFileUploaded(file);
      }
    }, 100);
  };
  
  const typeLabel = type === "cost" ? "成本表" : "订单表";
  const typeIcon = type === "cost" ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
      <path d="M10 9H8"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <line x1="3" x2="21" y1="9" y2="9"/>
      <line x1="3" x2="21" y1="15" y2="15"/>
      <line x1="9" x2="9" y1="9" y2="21"/>
      <line x1="15" x2="15" y1="9" y2="21"/>
    </svg>
  );
  
  const bgColor = type === "cost" ? "bg-primary/5" : "bg-blue-500/5";
  
  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between items-center">
        <Label 
          htmlFor={`${type}-file`}
          className="text-sm font-medium flex items-center"
        >
          {typeIcon}
          {typeLabel}上传
        </Label>
        {fileName && !uploading && !isProcessing && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            已准备就绪
          </span>
        )}
        {isProcessing && (
          <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            处理中
          </span>
        )}
      </div>
      
      <div className={`elevated rounded-lg overflow-hidden relative ${fileName ? "ring-1 ring-primary/20" : ""}`}>
        <Input
          id={`${type}-file`}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={uploading || isProcessing}
          className="cursor-pointer opacity-0 absolute inset-0 w-full h-full"
          ref={fileInputRef}
        />
        <div className={`p-3 rounded-lg transition-colors ${bgColor} border border-transparent hover:border-primary/20 ${(uploading || isProcessing) ? "opacity-70" : ""}`}>
          <div className="flex flex-col items-center justify-center gap-2 py-3">
            {uploading ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-primary/70">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            ) : isProcessing ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-primary/70">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${type === "cost" ? "text-primary/70" : "text-blue-500/70"}`}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            )}
            
            <p className="text-sm text-muted-foreground text-center">
              {uploading 
                ? "上传中..." 
                : isProcessing
                ? "处理中..."
                : fileName 
                  ? `已选择: ${fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName}` 
                  : `点击或拖拽${typeLabel}文件`
              }
            </p>
            {!uploading && !isProcessing && !fileName && (
              <p className="text-xs text-muted-foreground/70">支持 .xlsx, .xls 格式</p>
            )}
          </div>
        </div>
      </div>
      
      {uploading && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[80%]">{fileName}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}
      
      {isProcessing && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[80%]">{fileName}</span>
            <span className="text-blue-500">分析中...</span>
          </div>
          <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full animate-pulse opacity-70 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}); 