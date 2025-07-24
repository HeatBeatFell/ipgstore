import React from "react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-md">
        <div className="absolute inset-0 bg-primary opacity-30 blur-sm"></div>
        <span className="text-primary-foreground font-bold text-lg relative z-10">IP</span>
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg tracking-tight">艾皮电数据聚合</span>
        <span className="text-xs text-muted-foreground">Excel数据处理平台</span>
      </div>
    </div>
  );
} 