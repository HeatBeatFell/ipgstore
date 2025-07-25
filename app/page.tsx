"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Logo } from "@/components/Logo";
import { FileUpload, type FileUploadRef } from "@/components/FileUpload";
import { DataPreview } from "@/components/DataPreview";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/excel-service";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingIndicator, FullScreenLoading } from "@/components/LoadingIndicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X, Filter, ArrowDownAZ, Hash, FileDigit, FileSpreadsheet, Tag, RefreshCw } from "lucide-react";

export default function Home() {
  // 加载状态
  const [pageLoading, setPageLoading] = useState(true);

  // 导出加载状态
  const [exportLoading, setExportLoading] = useState(false);

  // 组件挂载后的初始化效果
  useEffect(() => {
    // 模拟页面加载
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // 状态管理
  const [costFile, setCostFile] = useState<File | null>(null);
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [costData, setCostData] = useState<Array<Record<string, string | number | null>>>([]);
  const [orderData, setOrderData] = useState<Array<Record<string, string | number | null>>>([]);
  const [resultData, setResultData] = useState<Array<Record<string, string | number | null>>>([]);
  const [costFields, setCostFields] = useState<string[]>([]);
  const [orderFields, setOrderFields] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [fileProcessing, setFileProcessing] = useState<{
    cost: boolean;
    order: boolean;
  }>({
    cost: false,
    order: false,
  });

  // 文件处理是否正在初始化(最初读取阶段)
  const [fileInitializing, setFileInitializing] = useState(false);

  // 文件输入引用
  const costFileInputRef = useRef<FileUploadRef>(null);
  const orderFileInputRef = useRef<FileUploadRef>(null);

  // 选择用于匹配的字段，默认选择第一个字段或名称包含"code"或"编码"的字段
  const [selectedCostMerchantCode, setSelectedCostMerchantCode] = useState("");
  const [selectedOrderMerchantCode, setSelectedOrderMerchantCode] = useState("");
  const [selectedOrderCostField, setSelectedOrderCostField] = useState("");

  // 统计数据
  const [stats, setStats] = useState({
    costCount: 0,
    orderCount: 0,
    matchedCount: 0,
    unmatchedCount: 0,
  });

  // 分页状态
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 25, // 修改为25条/页
  });

  // 搜索状态
  const [searchState, setSearchState] = useState({
    query: "",
    field: "all" as "all" | "productName" | "merchantCode" | "subOrderId",
  });
  const [searchInputValue, setSearchInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // 过滤类型
  const [filterType, setFilterType] = useState<"all" | "matched" | "unmatched">("all");

  // 过滤后的数据
  const filteredData = useMemo(() => {
    if (!resultData.length) return resultData;
    
    // 首先按匹配状态过滤
    let filtered = resultData;
    if (filterType !== "all" && selectedOrderCostField) {
      filtered = resultData.filter(item => {
        const costValue = item[selectedOrderCostField];
        const isMatched = costValue !== null && costValue !== '';
        return filterType === "matched" ? isMatched : !isMatched;
      });
    }
    
    // 如果没有搜索查询，直接返回按匹配状态过滤的结果
    if (!searchState.query) return filtered;

    // 商品名称、商家编码、子订单编号可能的字段名映射
    const fieldMapping = {
      productName: ["productName", "product", "product_name", "name", "goodsName", "goods_name", "商品名称", "名称", "商品", "品名"],
      merchantCode: ["merchantCode", "merchant_code", "merchantId", "merchant_id", "商家编码", "商家代码", "商户编码", "商户代码"],
      subOrderId: ["subOrderId", "sub_order_id", "orderItemId", "order_item_id", "子订单编号", "子订单号", "订单项编号"],
    };

    // 再根据搜索条件过滤
    return filtered.filter((item) => {
      // 如果选择全部字段，尝试在所有值中搜索
      if (searchState.field === "all") {
        return Object.values(item).some((value) => value !== null && String(value).toLowerCase().includes(searchState.query.toLowerCase()));
      }

      // 否则在指定字段类型中搜索
      const possibleFieldNames = fieldMapping[searchState.field];

      // 找到实际数据中匹配的字段名
      const matchedFields = Object.keys(item).filter((key) => possibleFieldNames.some((fieldName) => key.toLowerCase().includes(fieldName.toLowerCase())));

      // 在匹配的字段中搜索
      return matchedFields.some((field) => {
        const value = item[field];
        return value !== null && String(value).toLowerCase().includes(searchState.query.toLowerCase());
      });
    });
  }, [resultData, searchState.query, searchState.field, filterType, selectedOrderCostField]);

  // 当前页数据
  const currentPageData = useMemo(() => {
    const { currentPage, pageSize } = pagination;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, pagination]);

  // 分页变化处理
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page,
    }));
  };

  // 搜索处理
  const handleSearch = () => {
    if (!searchInputValue.trim()) {
      setSearchState((prev) => ({
        ...prev,
        query: "",
      }));
      return;
    }

    setIsSearching(true);

    // 使用setTimeout模拟搜索过程，给用户更好的体验
    setTimeout(() => {
      setSearchState((prev) => ({
        ...prev,
        query: searchInputValue,
      }));
      setPagination((prev) => ({
        ...prev,
        currentPage: 1, // 重置到第一页
      }));
      setIsSearching(false);
    }, 300);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchInputValue("");
    setSearchState((prev) => ({
      ...prev,
      query: "",
    }));
  };

  // 搜索字段变化处理
  const handleSearchFieldChange = (value: string) => {
    setSearchState((prev) => ({
      ...prev,
      field: value as "all" | "productName" | "merchantCode" | "subOrderId",
    }));
  };

  // 当按下Enter键时触发搜索
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // toast ID引用
  const toastIdRef = useRef<{ [key: string]: string }>({});

  // Web Worker引用
  const workerRef = useRef<Worker | null>(null);

  // 创建和销毁Web Worker
  useEffect(() => {
    // 仅在浏览器环境下创建Worker
    if (typeof window !== "undefined") {
      try {
        // 创建Worker
        workerRef.current = new Worker(new URL("../workers/excel-worker.ts", import.meta.url), { type: "module" });

        // 设置Worker消息处理
        workerRef.current.onmessage = (e) => {
          const { type, result, error, id } = e.data;

          if (type === "process_complete") {
            // 处理完成，更新状态
            if (id === "cost_file") {
              setCostData(result.data || []);
              setCostFields(Object.keys(result.data[0] || {}));
              setFileProcessing((prev) => ({ ...prev, cost: false }));

              // 更新统计信息
              setStats((prev) => ({
                ...prev,
                costCount: result.count || 0,
              }));

              // 自动选择字段
              if (result.data && result.data.length > 0) {
                // 尝试自动识别merchantCode字段
                const possibleMerchantFields = Object.keys(result.data[0]).filter((field) => field.toLowerCase().includes("merchant") || field.toLowerCase().includes("商家") || field.toLowerCase().includes("商户") || field.toLowerCase().includes("code"));

                // 尝试自动识别cost字段
                const possibleCostFields = Object.keys(result.data[0]).filter((field) => field.toLowerCase().includes("cost") || field.toLowerCase().includes("成本") || field.toLowerCase().includes("价格") || field.toLowerCase().includes("price"));

                if (possibleMerchantFields.length > 0) {
                  setSelectedCostMerchantCode(possibleMerchantFields[0]);
                }

                if (possibleCostFields.length > 0) {
                  setSelectedOrderCostField(possibleCostFields[0]);
                }
              }

              // 更新toast
              const costToastId = toastIdRef.current.cost;
              if (costToastId) {
                toast.success("成本表处理完成", {
                  id: costToastId,
                  duration: 3000, // 3秒后自动关闭
                });
              } else {
                // 如果没有记录之前的toast ID，创建一个新的
                toast.success("成本表处理完成", {
                  id: `cost-complete-${Date.now()}`,
                  duration: 3000,
                });
              }
            } else if (id === "order_file") {
              setOrderData(result.data || []);
              setOrderFields(Object.keys(result.data[0] || {}));
              setFileProcessing((prev) => ({ ...prev, order: false }));

              // 更新统计信息
              setStats((prev) => ({
                ...prev,
                orderCount: result.count || 0,
              }));

              // 自动选择字段
              if (result.data && result.data.length > 0) {
                // 尝试自动识别merchantCode字段
                const possibleMerchantFields = Object.keys(result.data[0]).filter((field) => field.toLowerCase().includes("merchant") || field.toLowerCase().includes("商家") || field.toLowerCase().includes("商户") || field.toLowerCase().includes("code"));

                if (possibleMerchantFields.length > 0) {
                  setSelectedOrderMerchantCode(possibleMerchantFields[0]);
                }
              }

              // 更新toast
              const orderToastId = toastIdRef.current.order;
              if (orderToastId) {
                toast.success("订单表处理完成", {
                  id: orderToastId,
                  duration: 3000, // 3秒后自动关闭
                });
              } else {
                // 如果没有记录之前的toast ID，创建一个新的
                toast.success("订单表处理完成", {
                  id: `order-complete-${Date.now()}`,
                  duration: 3000,
                });
              }
            } else if (id === "merge_preview") {
              setResultData(result.data || []);

              // 更新统计信息
              setStats((prev) => ({
                ...prev,
                matchedCount: result.matched || 0,
                unmatchedCount: result.unmatchedCount || 0,
              }));

              setProcessing(false);

              // 更新toast
              const mergeToastId = toastIdRef.current.merge;
              if (mergeToastId) {
                toast.success(`合并处理完成，匹配 ${result.matched} 条数据`, {
                  id: mergeToastId,
                  duration: 3000, // 3秒后自动关闭
                });
              } else {
                // 如果没有记录之前的toast ID，创建一个新的
                toast.success(`合并处理完成，匹配 ${result.matched} 条数据`, {
                  id: `merge-complete-${Date.now()}`,
                  duration: 3000,
                });
              }
            }
          } else if (type === "error") {
            // 处理错误
            if (id === "cost_file") {
              setFileProcessing((prev) => ({ ...prev, cost: false }));
              const costToastId = toastIdRef.current.cost;
              if (costToastId) {
                toast.error(`成本表处理错误: ${error}`, {
                  id: costToastId,
                  duration: 5000, // 错误信息显示更久
                });
              } else {
                // 如果没有记录之前的toast ID，创建一个新的
                toast.error(`成本表处理错误: ${error}`, {
                  id: `cost-error-${Date.now()}`,
                  duration: 5000,
                });
              }
            } else if (id === "order_file") {
              setFileProcessing((prev) => ({ ...prev, order: false }));
              const orderToastId = toastIdRef.current.order;
              if (orderToastId) {
                toast.error(`订单表处理错误: ${error}`, {
                  id: orderToastId,
                  duration: 5000, // 错误信息显示更久
                });
              } else {
                // 如果没有记录之前的toast ID，创建一个新的
                toast.error(`订单表处理错误: ${error}`, {
                  id: `order-error-${Date.now()}`,
                  duration: 5000,
                });
              }
            } else if (id === "merge_preview") {
              setProcessing(false);
              const mergeToastId = toastIdRef.current.merge;
              if (mergeToastId) {
                toast.error(`合并处理错误: ${error}`, {
                  id: mergeToastId,
                  duration: 5000, // 错误信息显示更久
                });
              } else {
                // 如果没有记录之前的toast ID，创建一个新的
                toast.error(`合并处理错误: ${error}`, {
                  id: `merge-error-${Date.now()}`,
                  duration: 5000,
                });
              }
            }
          }
        };

        // 处理Worker错误
        workerRef.current.onerror = (error) => {
          console.error("Worker error:", error);
          toast.error("处理数据时发生错误");
          setFileProcessing({ cost: false, order: false });
          setProcessing(false);
        };
      } catch (error) {
        console.error("Failed to initialize worker:", error);
        toast.error("初始化处理模块失败，请刷新页面重试");
      }
    }

    // 组件卸载时终止Worker
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // 处理成本表上传 - Web Worker处理
  const handleCostFileUploaded = async (file: File) => {
    if (!file) return;

    setCostFile(file);
    setFileProcessing((prev) => ({ ...prev, cost: true }));
    setFileInitializing(true);

    // 显示处理中提示，并保存toast ID
    const toastId = toast.loading("成本表处理中...", {
      duration: 0, // 无限期显示，直到更新状态
      id: `cost-processing-${Date.now()}`, // 添加时间戳确保ID唯一
    });
    toastIdRef.current = { ...toastIdRef.current, cost: toastId.toString() };

    try {
      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 发送数据给Worker处理
      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: "process_excel",
            data: arrayBuffer,
            id: "cost_file",
          });
        }
        setFileInitializing(false);
      }, 50); // 短暂延时，让UI有机会更新
    } catch (error) {
      console.error("处理成本表时发生错误:", error);
      setFileProcessing((prev) => ({ ...prev, cost: false }));
      setFileInitializing(false);
      toast.error(`成本表处理错误: ${error instanceof Error ? error.message : String(error)}`, {
        id: toastId.toString(),
        duration: 5000,
      });
    }
  };

  // 处理订单表上传 - Web Worker处理
  const handleOrderFileUploaded = async (file: File) => {
    if (!file) return;

    setOrderFile(file);
    setFileProcessing((prev) => ({ ...prev, order: true }));
    setFileInitializing(true);

    // 显示处理中提示，并保存toast ID
    const toastId = toast.loading("订单表处理中...", {
      duration: 0, // 无限期显示，直到更新状态
      id: `order-processing-${Date.now()}`, // 添加时间戳确保ID唯一
    });
    toastIdRef.current = { ...toastIdRef.current, order: toastId.toString() };

    try {
      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 发送数据给Worker处理
      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: "process_excel",
            data: arrayBuffer,
            id: "order_file",
          });
        }
        setFileInitializing(false);
      }, 50); // 短暂延时，让UI有机会更新
    } catch (error) {
      console.error("处理订单表时发生错误:", error);
      setFileProcessing((prev) => ({ ...prev, order: false }));
      setFileInitializing(false);
      toast.error(`订单表处理错误: ${error instanceof Error ? error.message : String(error)}`, {
        id: toastId.toString(),
        duration: 5000,
      });
    }
  };

  // 处理合并预览 - Web Worker处理
  const handleMergePreview = () => {
    if (!canMergePreview) return;

    setProcessing(true);
    setResultData([]);

    // 显示处理中提示，并保存toast ID
    const toastId = toast.loading("数据合并处理中...", {
      duration: 0, // 无限期显示，直到更新状态
      id: `merge-processing-${Date.now()}`, // 添加时间戳确保ID唯一
    });
    toastIdRef.current = { ...toastIdRef.current, merge: toastId.toString() };

    // 使用Worker进行合并处理
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "merge_data",
        costData: costData,
        orderData: orderData,
        costMerchantCodeField: selectedCostMerchantCode,
        orderMerchantCodeField: selectedOrderMerchantCode,
        costValueField: selectedOrderCostField,
        id: "merge_preview",
      });
    }
  };

  // 导出Excel文件
  const handleExportFile = async () => {
    if (resultData.length === 0) {
      toast.error("没有可导出的数据", {
        duration: 3000,
        id: `export-error-${Date.now()}`, // 添加时间戳确保ID唯一
      });
      return;
    }

    setExportLoading(true);
    const toastId = toast.loading("准备导出数据...", {
      duration: 0, // 无限期显示，直到更新状态
      id: `export-processing-${Date.now()}`, // 添加时间戳确保ID唯一
    });

    try {
      // 创建带有时间戳的文件名
      const date = new Date();
      const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;
      const timeString = `${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}`;
      const fileName = `合并数据_${dateString}_${timeString}`;

      // 使用await等待异步导出完成
      await exportToExcel(resultData, fileName);

      toast.success("数据导出成功", {
        id: toastId.toString(),
        duration: 3000,
      });
    } catch (error) {
      console.error("导出数据时发生错误:", error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : String(error)}`, {
        id: toastId.toString(),
        duration: 5000,
      });
    } finally {
      setExportLoading(false);
    }
  };

  // 重置所有数据
  const handleReset = () => {
    // 显示确认对话框
    if (costData.length > 0 || orderData.length > 0 || resultData.length > 0) {
      const confirmed = window.confirm("确定要重置所有数据吗？这将清除已上传的文件和处理结果。");
      if (!confirmed) return;
    }

    // 重置文件和数据
    setCostFile(null);
    setOrderFile(null);
    setCostData([]);
    setOrderData([]);
    setResultData([]);

    // 重置字段
    setCostFields([]);
    setOrderFields([]);
    setSelectedCostMerchantCode("");
    setSelectedOrderMerchantCode("");
    setSelectedOrderCostField("");

    // 重置处理状态
    setFileProcessing({ cost: false, order: false });
    setProcessing(false);
    setStats({
      costCount: 0,
      orderCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    });

    // 重置分页和搜索
    setPagination({
      currentPage: 1,
      pageSize: 25,
    });
    setSearchState({
      query: "",
      field: "all",
    });
    setSearchInputValue("");
    setIsSearching(false);
    setFilterType("all"); // 重置过滤类型

    // 重置文件上传组件状态
    if (costFileInputRef.current) {
      costFileInputRef.current.resetFileName();
    }
    if (orderFileInputRef.current) {
      orderFileInputRef.current.resetFileName();
    }

    toast.success("已重置所有数据", {
      duration: 3000,
      id: `reset-success-${Date.now()}`, // 添加时间戳确保ID唯一
    });
  };

  // 字段选择处理函数
  const handleCostFieldChange = (value: string) => {
    setSelectedCostMerchantCode(value);
  };

  const handleOrderFieldChange = (value: string) => {
    setSelectedOrderMerchantCode(value);
  };

  const handleCostValueFieldChange = (value: string) => {
    setSelectedOrderCostField(value);
  };

  // 处理编辑成本值
  const handleUpdateCostValue = (rowIndex: number, value: string | number | null) => {
    // 计算实际行索引（考虑分页）
    const actualIndex = (pagination.currentPage - 1) * pagination.pageSize + rowIndex;
    
    // 更新结果数据
    const newResultData = [...resultData];
    if (actualIndex >= 0 && actualIndex < newResultData.length && selectedOrderCostField) {
      newResultData[actualIndex] = {
        ...newResultData[actualIndex],
        [selectedOrderCostField]: value
      };
      
      // 更新统计数据
      const oldValue = resultData[actualIndex][selectedOrderCostField];
      const hasOldValue = oldValue !== null && oldValue !== '';
      const hasNewValue = value !== null && value !== '';
      
      if (!hasOldValue && hasNewValue) {
        // 未匹配 -> 匹配
        setStats(prev => ({
          ...prev,
          matchedCount: prev.matchedCount + 1,
          unmatchedCount: prev.unmatchedCount - 1
        }));
      } else if (hasOldValue && !hasNewValue) {
        // 匹配 -> 未匹配
        setStats(prev => ({
          ...prev,
          matchedCount: prev.matchedCount - 1,
          unmatchedCount: prev.unmatchedCount + 1
        }));
      }
      
      setResultData(newResultData);
      
      // 显示成功提示
      toast.success("成本值已更新", {
        id: `cost-update-${Date.now()}`,
        duration: 2000
      });
    }
  };

  // 判断是否可以进行合并预览
  const canMergePreview = costData.length > 0 && orderData.length > 0 && !processing && !fileProcessing.cost && !fileProcessing.order && selectedCostMerchantCode && selectedOrderMerchantCode && selectedOrderCostField;

  // 处理过滤类型变化
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value as "all" | "matched" | "unmatched");
    // 切换过滤类型时重置到第一页
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  // 如果页面加载中，显示加载动画
  if (pageLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mb-4">
            <LoadingIndicator size="lg" text="" />
          </div>
          <h1 className="text-xl font-bold">艾皮电数据聚合平台</h1>
          <p className="text-sm text-muted-foreground mt-2">智能匹配成本与订单数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-muted/10 flex flex-col overflow-hidden">
      {/* 全屏加载 */}
      <FullScreenLoading isOpen={exportLoading} text="正在导出文件..." subText={`正在处理 ${resultData.length.toLocaleString()} 条数据，请稍候`} />

      {/* 顶部导航栏 */}
      <header className="h-14 bg-background border-b flex items-center justify-between px-5 shadow-sm">
        <Logo />
        <ThemeToggle />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        <div className="w-80 bg-background border-r shadow-sm overflow-auto">

          {/* 文件上传区 */}
          <div className="p-4 border-b">
            {/* <h3 className="text-xs font-medium mb-3 text-muted-foreground">文件上传</h3> */}
            <div className="space-y-3">
              <FileUpload type="cost" onFileUploaded={handleCostFileUploaded} isProcessing={fileProcessing.cost} ref={costFileInputRef} />
              <FileUpload type="order" onFileUploaded={handleOrderFileUploaded} isProcessing={fileProcessing.order} ref={orderFileInputRef} />
            </div>
          </div>

          {/* 字段匹配设置 */}
          {costFields.length > 0 && orderFields.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                字段匹配设置
              </h3>
              <div className="space-y-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium">成本表唯一标识字段</span>
                  </div>
                  <Select value={selectedCostMerchantCode} onValueChange={handleCostFieldChange}>
                    <SelectTrigger className="w-full h-8 text-xs bg-muted/30">
                      <SelectValue placeholder="选择字段..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costFields.map((field, index) => (
                        <SelectItem key={`cost-field-${index}-${field}`} value={field} className="text-xs">
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium">订单表唯一标识字段</span>
                  </div>
                  <Select value={selectedOrderMerchantCode} onValueChange={handleOrderFieldChange}>
                    <SelectTrigger className="w-full h-8 text-xs bg-muted/30">
                      <SelectValue placeholder="选择字段..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orderFields.map((field, index) => (
                        <SelectItem key={`order-field-${index}-${field}`} value={field} className="text-xs">
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowDownAZ className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-medium">成本值字段</span>
                  </div>
                  <Select value={selectedOrderCostField} onValueChange={handleCostValueFieldChange}>
                    <SelectTrigger className="w-full h-8 text-xs bg-muted/30">
                      <SelectValue placeholder="选择字段..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costFields.map((field, index) => (
                        <SelectItem key={`cost-value-${index}-${field}`} value={field} className="text-xs">
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCostMerchantCode && selectedOrderMerchantCode && selectedOrderCostField && (
                <div className="bg-muted/20 rounded-md p-2 border border-muted/30 text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-amber-500" />
                    成本表: <span className="font-medium text-foreground">{selectedCostMerchantCode}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-blue-500" />
                    订单表: <span className="font-medium text-foreground">{selectedOrderMerchantCode}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileDigit className="h-3 w-3 text-green-500" />
                    成本值: <span className="font-medium text-foreground">{selectedOrderCostField}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 数据统计区域 */}
          <div className="p-4 border-b">
            <h3 className="text-xs font-medium mb-3 text-muted-foreground flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
              数据统计
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border rounded-md bg-background flex items-center gap-2" key="stats-cost">
                <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">成本表</div>
                  <div className="text-sm font-medium">{stats.costCount}</div>
                </div>
              </div>
              <div className="p-2 border rounded-md bg-background flex items-center gap-2" key="stats-order">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    <line x1="7" x2="17" y1="2" y2="22" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">订单表</div>
                  <div className="text-sm font-medium">{stats.orderCount}</div>
                </div>
              </div>
              <div className="p-2 border rounded-md bg-background flex items-center gap-2" key="stats-matched">
                <div className="w-8 h-8 rounded-md bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">已匹配</div>
                  <div className="text-sm font-medium">{stats.matchedCount}</div>
                </div>
              </div>
              <div className="p-2 border rounded-md bg-background flex items-center gap-2" key="stats-unmatched">
                <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" x2="9" y1="9" y2="15" />
                    <line x1="9" x2="15" y1="9" y2="15" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">未匹配</div>
                  <div className="text-sm font-medium">{stats.unmatchedCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 操作区 */}
          <div className="p-4">
            <h3 className="text-xs font-medium mb-3 text-muted-foreground flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              操作
            </h3>

            <div className="space-y-3">
              <Button onClick={handleMergePreview} disabled={!canMergePreview} className="w-full bg-primary hover:bg-primary/90 h-9">
                {processing || fileProcessing.cost || fileProcessing.order ? (
                  <div className="flex items-center">
                    <LoadingIndicator size="sm" text="" />
                    <span className="ml-2">处理中...</span>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <circle cx="18" cy="18" r="3" />
                      <circle cx="6" cy="6" r="3" />
                      <path d="M6 21V9a9 9 0 0 0 9 9" />
                    </svg>
                    合并预览
                  </>
                )}
              </Button>

              <Button onClick={handleExportFile} disabled={resultData.length === 0 || exportLoading} variant="outline" className="w-full h-9">
                {exportLoading ? (
                  <LoadingIndicator size="sm" text="导出中..." />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    导出文件
                  </>
                )}
              </Button>

              <Button variant="ghost" className="w-full h-9 text-xs flex items-center gap-1.5" onClick={handleReset} disabled={processing || fileProcessing.cost || fileProcessing.order}>
                <RefreshCw className="h-3 w-3" />
                重置数据
              </Button>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
          {/* 顶部工具栏 */}
          <div className="h-12 border-b bg-background px-6 flex items-center justify-between shadow-sm">
            <h1 className="font-medium text-lg flex items-center">数据聚合预览</h1>

            <div className="flex items-center gap-2">{resultData.length > 0 && <span className="text-xs text-muted-foreground">共 {filteredData.length} 条记录</span>}</div>
          </div>

          {/* 搜索区域 */}
          {resultData.length > 0 && (
            <div className="border-b bg-background px-6 py-3">
              <div className="flex gap-2 items-center">
                <Select value={searchState.field} onValueChange={handleSearchFieldChange}>
                  <SelectTrigger className="w-[180px] h-9 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="选择搜索字段" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="search-field-all" value="all" className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5" />
                        全部字段
                      </span>
                    </SelectItem>
                    <SelectItem key="search-field-productName" value="productName">
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
                        商品名称
                      </span>
                    </SelectItem>
                    <SelectItem key="search-field-merchantCode" value="merchantCode">
                      <span className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 text-amber-500" />
                        商家编码
                      </span>
                    </SelectItem>
                    <SelectItem key="search-field-subOrderId" value="subOrderId">
                      <span className="flex items-center gap-2">
                        <FileDigit className="h-3.5 w-3.5 text-green-500" />
                        子订单编号
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* 添加匹配状态过滤器 */}
                <Select value={filterType} onValueChange={handleFilterTypeChange}>
                  <SelectTrigger className="w-[160px] h-9 bg-muted/30">
                    <div className="flex items-center gap-2">
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
                        className="text-primary/70"
                      >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                        <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
                      </svg>
                      <SelectValue placeholder="选择数据状态" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="filter-all" value="all">
                      <span className="flex items-center gap-2">
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
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                        </svg>
                        全部数据
                      </span>
                    </SelectItem>
                    <SelectItem key="filter-matched" value="matched">
                      <span className="flex items-center gap-2">
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
                          className="text-green-500"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        已匹配数据
                      </span>
                    </SelectItem>
                    <SelectItem key="filter-unmatched" value="unmatched">
                      <span className="flex items-center gap-2">
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
                          className="text-red-500"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        未匹配数据
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Input placeholder="搜索..." className="pl-9" value={searchInputValue} onChange={(e) => setSearchInputValue(e.target.value)} onKeyDown={handleKeyDown} disabled={isSearching} />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  {searchInputValue && !isSearching && (
                    <button className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground" onClick={handleClearSearch}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    </div>
                  )}
                </div>

                <Button onClick={handleSearch} size="sm" disabled={isSearching} className="relative">
                  {isSearching ? (
                    <>
                      <span className="opacity-0">搜索</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      </div>
                    </>
                  ) : (
                    <>搜索</>
                  )}
                </Button>
              </div>

              {(searchState.query || filterType !== "all") && (
                <div className="mt-2 text-xs flex items-center justify-between">
                  <div className="flex items-center flex-wrap gap-2">
                    {searchState.query && (
                      <div className="flex items-center">
                        <span className="text-muted-foreground">搜索: </span>
                        <span className="text-primary font-medium ml-1">{searchState.query}</span>
                        <span className="text-muted-foreground ml-2">字段: </span>
                        <span className="text-primary font-medium flex items-center gap-1 inline-flex ml-1">
                          {searchState.field === "all" ? (
                            <>
                              <Search className="h-3 w-3" />
                              全部字段
                            </>
                          ) : searchState.field === "productName" ? (
                            <>
                              <FileSpreadsheet className="h-3 w-3 text-blue-500" />
                              商品名称
                            </>
                          ) : searchState.field === "merchantCode" ? (
                            <>
                              <Hash className="h-3 w-3 text-amber-500" />
                              商家编码
                            </>
                          ) : (
                            <>
                              <FileDigit className="h-3 w-3 text-green-500" />
                              子订单编号
                            </>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {filterType !== "all" && (
                      <div className="flex items-center ml-2 border-l pl-2">
                        <span className="text-muted-foreground">状态过滤: </span>
                        <span className="text-primary font-medium flex items-center gap-1 ml-1">
                          {filterType === "matched" ? (
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
                                className="text-green-500"
                              >
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                              已匹配
                            </>
                          ) : (
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
                                className="text-red-500"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                              </svg>
                              未匹配
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {filterType !== "all" && (
                      <button 
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        onClick={() => setFilterType("all")}
                      >
                        清除过滤 
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
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                    
                    {searchState.query && (
                      <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1" onClick={handleClearSearch} disabled={isSearching}>
                        清除搜索 
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 数据内容区 */}
          <div className="flex-1 overflow-auto p-0">
            {resultData.length > 0 ? (
              <div className="h-full">
                {isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-6 text-lg font-medium text-primary">搜索中...</p>
                    <p className="mt-2 text-sm text-muted-foreground">正在搜索&quot;{searchInputValue}&quot;</p>
                  </div>
                ) : (
                  <DataPreview 
                    data={currentPageData} 
                    title="" 
                    currentPage={pagination.currentPage} 
                    pageSize={pagination.pageSize} 
                    onPageChange={handlePageChange} 
                    totalItems={filteredData.length} 
                    searchQuery={searchState.query} 
                    costValueField={selectedOrderCostField} 
                    priceField={""} 
                    onUpdateCostValue={handleUpdateCostValue}
                  />
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="p-8">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                      </svg>
                    </div>

                    <h2 className="text-2xl font-medium mb-3 text-primary/90">准备开始</h2>
                    <p className="text-sm text-muted-foreground mb-10 max-w-sm mx-auto">请先上传成本表和订单表Excel文件，点击&quot;合并预览&quot;按钮查看结果</p>

                    <div className="flex items-center justify-center gap-10">
                      <div className="relative" key="step-1">
                        <div className="flex flex-col items-center relative">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">1</div>
                          <span className="text-sm">上传文件</span>
                        </div>
                      </div>

                      <div className="w-16 h-px bg-primary/10 relative" key="step-connector-1">
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20"></div>
                      </div>

                      <div className="relative" key="step-2">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">2</div>
                          <span className="text-sm">合并预览</span>
                        </div>
                      </div>

                      <div className="w-16 h-px bg-primary/10 relative" key="step-connector-2">
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20"></div>
                      </div>

                      <div className="relative" key="step-3">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">3</div>
                          <span className="text-sm">导出结果</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
