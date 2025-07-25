import React, { useState } from "react";
import { Input } from "@/components/ui/input";

interface DataPreviewProps {
  data: Array<Record<string, string | number | null>>;
  title: string;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  searchQuery?: string;
  costValueField?: string;
  priceField?: string;
  onUpdateCostValue?: (rowIndex: number, value: string | number | null) => void;
}

export function DataPreview({
  data,
  title,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  totalItems,
  searchQuery,
  costValueField,
  priceField,
  onUpdateCostValue
}: DataPreviewProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredHeader, setHoveredHeader] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number | null, field: string | null }>({
    rowIndex: null,
    field: null
  });
  const [editValue, setEditValue] = useState<string>("");
  
  // 如果没有传入总条数，默认使用当前数据长度
  const totalCount = totalItems !== undefined ? totalItems : (data ? data.length : 0);
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // 检查字段是否是价格或成本字段
  const isSpecialField = (header: string) => {
    // 直接检查列名是否为"成本"或"商品金额"
    if (header === "成本") return 'cost';
    if (header === "商品金额") return 'price';
    if (costValueField && header === costValueField) return 'cost';
    return null;
  };

  // 检查一行是否未匹配成功（成本值为null）
  const isUnmatched = (row: Record<string, string | number | null>) => {
    if (!costValueField) return false;
    return row[costValueField] === null || row[costValueField] === '';
  };

  // 处理编辑开始
  const handleEditStart = (rowIndex: number, field: string, value: string | number | null) => {
    setEditingCell({ rowIndex, field });
    setEditValue(value !== null ? String(value) : "");
  };

  // 处理编辑取消
  const handleEditCancel = () => {
    setEditingCell({ rowIndex: null, field: null });
    setEditValue("");
  };

  // 处理编辑保存
  const handleEditSave = (rowIndex: number) => {
    if (onUpdateCostValue && editingCell.field === costValueField) {
      // 转换编辑值为适当的类型
      let valueToSave: string | number | null = editValue;
      
      // 如果字段是成本字段，尝试转换为数字
      if (editValue === "") {
        valueToSave = null;
      } else {
        const numValue = Number(editValue);
        if (!isNaN(numValue)) {
          valueToSave = numValue;
        }
      }
      
      onUpdateCostValue(rowIndex, valueToSave);
    }
    
    handleEditCancel();
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm w-full h-full flex flex-col">
        <div className="bg-muted/40 p-4 border-b flex items-center justify-between">
          <div className="text-lg font-medium">{title}</div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-muted-foreground/60"
            >
              <path d="M17.5 22h.5c.5 0 1-.2 1.4-.6.4-.4.6-.9.6-1.4V7.5L14.5 2H6c-.5 0-1 .2-1.4.6C4.2 3 4 3.5 4 4v3"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M4 16.5V17c0 .5.2 1 .6 1.4.4.4.9.6 1.4.6h4"></path>
              <circle cx="11.5" cy="18.5" r="2.5"></circle>
              <circle cx="16.5" cy="13.5" r="2.5"></circle>
              <path d="M3 3 l18 18"></path>
            </svg>
            <div className="text-lg font-medium text-muted-foreground/80">暂无数据</div>
            {searchQuery && (
              <div className="text-sm text-muted-foreground/60">
                找不到与&quot;{searchQuery}&quot;相关的数据
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="rounded-lg border-0 bg-card shadow-none w-full h-full flex flex-col overflow-hidden">
      {/* 不再显示标题部分 */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {headers.map((header, headerIndex) => {
                const fieldType = isSpecialField(header);
                const headerStyle = 
                  fieldType === 'cost' ? 'bg-[#e2fbe8] dark:bg-green-900/20' :
                  fieldType === 'price' ? 'bg-[#fcf3cb] dark:bg-yellow-900/20' :
                  'bg-background shadow-[0_1px_2px_rgba(0,0,0,0.06)]';
                
                const textColor = 
                  fieldType === 'cost' ? 'text-green-700 dark:text-green-300' :
                  fieldType === 'price' ? 'text-yellow-700 dark:text-yellow-300' :
                  '';
                  
                return (
                  <th 
                    key={`header-${headerIndex}-${header}`} 
                    className={`
                      p-3 text-left border-b text-sm font-medium whitespace-nowrap
                      ${headerStyle}
                      ${hoveredHeader === header ? 'bg-opacity-80' : ''}
                    `}
                    onMouseEnter={() => setHoveredHeader(header)}
                    onMouseLeave={() => setHoveredHeader(null)}
                  >
                    <div className={`flex items-center gap-1 truncate max-w-xs ${textColor}`}>
                      {fieldType === 'cost' ? (
                        <span className="flex items-center gap-1">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="text-green-600 dark:text-green-400"
                          >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                          {header} 
                          <span className="text-xs text-green-600 dark:text-green-400 font-normal">(成本)</span>
                        </span>
                      ) : fieldType === 'price' ? (
                        <span className="flex items-center gap-1">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="text-yellow-600 dark:text-yellow-400"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 6v12M16 10H9.5a2.5 2.5 0 0 0 0 5H16"></path>
                          </svg>
                          {header}
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-normal">(金额)</span>
                        </span>
                      ) : (
                        header
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/30">
            {data.map((row, rowIndex) => {
              const rowId = `row-${rowIndex}-${Object.values(row)[0]?.toString().slice(0, 5) || rowIndex}`;
              const isRowUnmatched = costValueField && isUnmatched(row);
              
              return (
                <tr 
                  key={rowId} 
                  className={`
                    transition-colors duration-150
                    ${rowIndex % 2 === 0 ? "bg-background" : "bg-muted/5"}
                    ${isRowUnmatched ? "bg-red-50/30 dark:bg-red-900/5" : ""}
                    ${hoveredRow === rowIndex ? "bg-primary/5" : ""}
                    hover:bg-primary/5
                  `}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {headers.map((header, colIndex) => {
                    const fieldType = isSpecialField(header);
                    const cellStyle = 
                      fieldType === 'cost' ? 'bg-[#e2fbe8] dark:bg-green-900/10 font-medium' :
                      fieldType === 'price' ? 'bg-[#fcf3cb] dark:bg-yellow-900/10 font-medium' :
                      '';
                    
                    const isEmpty = row[header] === null || row[header] === '';
                    const isEditable = costValueField && header === costValueField;
                    const isEditing = editingCell.rowIndex === rowIndex && editingCell.field === header;
                    
                    // 判断是否是未匹配的成本单元格
                    const isUnmatchedCostCell = isEditable && isEmpty;
                    
                    return (
                      <td 
                        key={`cell-${rowId}-${colIndex}-${header}`} 
                        className={`
                          p-2 px-3 border-muted/20 text-sm
                          ${isEmpty ? "text-muted-foreground/70 italic" : ""}
                          ${hoveredHeader === header ? 'bg-opacity-80' : ''}
                          ${cellStyle}
                          ${hoveredRow === rowIndex ? 'bg-opacity-90' : ''}
                          ${isEditable ? 'cursor-pointer hover:bg-primary/10' : ''}
                          ${isEditing ? 'p-0 px-0' : ''}
                          ${isUnmatchedCostCell ? 'border border-dashed border-red-300 dark:border-red-800' : ''}
                        `}
                        onClick={isEditable && !isEditing ? () => handleEditStart(rowIndex, header, row[header]) : undefined}
                        title={isEditable ? "点击编辑成本值" : ""}
                      >
                        {isEditing ? (
                          <div className="flex items-center border p-1 bg-background shadow-sm rounded-sm w-full">
                            <Input
                              className="h-8 m-0 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm text-foreground bg-background px-2 w-full"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditSave(rowIndex);
                                } else if (e.key === 'Escape') {
                                  handleEditCancel();
                                }
                              }}
                              onBlur={() => handleEditSave(rowIndex)}
                              placeholder="输入成本值，回车确认..."
                            />
                          </div>
                        ) : (
                          <div className={`truncate max-w-xs flex items-center ${isEditable ? 'group' : ''}`}>
                            {!isEmpty ? (
                              <span>{String(row[header])}</span>
                            ) : (
                              <span className={`${isUnmatchedCostCell ? 'text-red-500 dark:text-red-400 flex items-center gap-1' : ''}`}>
                                {isUnmatchedCostCell ? (
                                  <>
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      width="12" 
                                      height="12" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <line x1="12" y1="8" x2="12" y2="12"></line>
                                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    未匹配
                                  </>
                                ) : (
                                  "-"
                                )}
                              </span>
                            )}
                            
                            {isEditable && (
                              <button
                                className={`ml-1 ${isUnmatchedCostCell ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} focus:opacity-100 transition-opacity`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditStart(rowIndex, header, row[header]);
                                }}
                                title="编辑成本值"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`${isUnmatchedCostCell ? 'text-red-500' : 'text-primary/70'}`}
                                >
                                  <path d="M12 20h9"></path>
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {onPageChange && totalPages > 1 && (
        <div className="py-3 px-4 border-t bg-background flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} 条，共 {totalCount.toLocaleString()} 条
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md text-sm border hover:bg-muted/30 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="首页"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md text-sm border hover:bg-muted/30 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="上一页"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span className="text-xs font-medium px-3 py-1 bg-muted/30 rounded-md">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md text-sm border hover:bg-muted/30 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="下一页"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md text-sm border hover:bg-muted/30 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="末页"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 