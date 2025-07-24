// Web Worker for Excel processing
// 注意：实际使用时需要确保xlsx库可以在Worker中正确运行

import * as XLSX from 'xlsx';

type ExcelData = Record<string, string | number | null>;

// 定义Worker的消息处理函数
self.onmessage = async (e: MessageEvent) => {
  const { type, data, id, costData, orderData, costMerchantCodeField, orderMerchantCodeField, costValueField, exportData, fileName, exportFormat } = e.data;

  try {
    // 处理Excel文件
    if (type === 'process_excel') {
      const result = processExcelFile(data);
      // 返回处理结果
      self.postMessage({
        type: 'process_complete',
        result,
        id
      });
    }
    // 合并数据
    else if (type === 'merge_data') {
      const result = matchCostAndOrder(
        costData,
        orderData,
        costMerchantCodeField,
        orderMerchantCodeField,
        costValueField
      );
      // 返回处理结果
      self.postMessage({
        type: 'process_complete',
        result,
        id
      });
    }
    // 导出Excel
    else if (type === 'export_excel') {
      // 使用指定格式导出数据
      const format = exportFormat || 'csv'; // 默认使用CSV
      let result;
      
      if (format === 'csv') {
        result = exportToCSV(exportData);
      } else {
        result = exportToExcel(exportData);
      }
      
      // 返回处理结果
      self.postMessage({
        type: 'export_complete',
        result,
        fileName,
        exportFormat: format,
        id
      });
    }
  } catch (error) {
    // 返回错误信息
    console.error('Worker error:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id
    });
  }
};

/**
 * 处理Excel文件
 * @param arrayBuffer Excel文件的ArrayBuffer
 * @returns 处理结果，包含数据和错误信息
 */
function processExcelFile(arrayBuffer: ArrayBuffer) {
  try {
    // 读取Excel文件
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // 将工作表转换为JSON对象数组
    const jsonData = XLSX.utils.sheet_to_json<ExcelData>(worksheet, { defval: null });

    // 检查数据是否为空
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return {
        success: false,
        error: '文件不包含数据或格式错误',
        data: [] as ExcelData[]
      };
    }

    // 返回成功结果
    return {
      success: true,
      data: jsonData,
      count: jsonData.length
    };
  } catch (error) {
    console.error('Excel处理错误:', error);
    return {
      success: false,
      error: `Excel处理错误: ${error instanceof Error ? error.message : String(error)}`,
      data: [] as ExcelData[]
    };
  }
}

/**
 * 匹配成本和订单数据，并确保成本列放在商品金额列后面
 * @param costData 成本数据
 * @param orderData 订单数据
 * @param costMerchantCodeField 成本表商家编码字段
 * @param orderMerchantCodeField 订单表商家编码字段
 * @param costValueField 成本值字段
 * @returns 处理结果，包含合并后的数据和统计信息
 */
function matchCostAndOrder(
  costData: ExcelData[],
  orderData: ExcelData[],
  costMerchantCodeField: string,
  orderMerchantCodeField: string,
  costValueField: string
) {
  try {
    // 检查输入数据
    if (!costData || !orderData || costData.length === 0 || orderData.length === 0) {
      return {
        success: false,
        error: '成本数据或订单数据为空',
        data: [] as ExcelData[],
        matched: 0,
        total: 0,
        unmatchedCount: 0
      };
    }

    if (!costMerchantCodeField || !orderMerchantCodeField || !costValueField) {
      return {
        success: false,
        error: '未指定匹配字段',
        data: [] as ExcelData[],
        matched: 0,
        total: 0,
        unmatchedCount: 0
      };
    }

    // 创建成本表映射：商家编码 -> 成本值
    const costMap = new Map<string, string | number | null>();
    
    for (const costItem of costData) {
      const merchantCode = costItem[costMerchantCodeField];
      if (merchantCode !== null && merchantCode !== undefined) {
        // 使用统一的字符串格式作为键，以便进行匹配
        const key = String(merchantCode).trim().toLowerCase();
        costMap.set(key, costItem[costValueField]);
      }
    }

    // 找到可能的商品金额列
    const findPriceColumn = (obj: ExcelData): string | null => {
      const priceKeywords = ['price', 'amount', '金额', '价格', '价值', '总价', '商品金额', 'total'];
      
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (priceKeywords.some(keyword => lowerKey.includes(keyword))) {
          return key;
        }
      }
      return null;
    };

    // 尝试识别第一行数据中的商品金额字段
    const priceColumn = orderData.length > 0 ? findPriceColumn(orderData[0]) : null;

    // 合并数据：为每个订单项添加对应的成本值，并确保成本列位置正确
    const result = orderData.map(orderItem => {
      // 如果没有找到商品金额列，或者希望保持原始顺序，使用简单复制
      if (!priceColumn) {
        const orderItemCopy = { ...orderItem };
        const merchantCode = orderItem[orderMerchantCodeField];
  
        if (merchantCode !== null && merchantCode !== undefined) {
          const key = String(merchantCode).trim().toLowerCase();
          orderItemCopy[costValueField] = costMap.get(key) ?? null;
        } else {
          orderItemCopy[costValueField] = null;
        }
  
        return orderItemCopy;
      } else {
        // 如果找到商品金额列，我们需要将成本列放在商品金额列后面
        // 为此需要重新构建对象，保持正确的字段顺序
        const newOrderItem: ExcelData = {};
        const merchantCode = orderItem[orderMerchantCodeField];
        const costValue = merchantCode !== null && merchantCode !== undefined 
          ? costMap.get(String(merchantCode).trim().toLowerCase()) ?? null
          : null;

        // 遍历原始对象的所有键
        for (const key of Object.keys(orderItem)) {
          newOrderItem[key] = orderItem[key];
          
          // 当遇到商品金额列时，紧接着插入成本列
          if (key === priceColumn) {
            newOrderItem[costValueField] = costValue;
          }
        }

        // 确保成本列已添加（以防商品金额列不存在或是最后一列）
        if (newOrderItem[costValueField] === undefined) {
          newOrderItem[costValueField] = costValue;
        }

        return newOrderItem;
      }
    });

    // 统计匹配情况
    const matched = result.filter(item => item[costValueField] !== null && item[costValueField] !== undefined).length;
    const unmatchedCount = result.length - matched;

    // 返回结果
    return {
      success: true,
      data: result,
      matched,
      total: result.length,
      unmatchedCount,
      costCount: costData.length,
      orderCount: orderData.length
    };
  } catch (error) {
    console.error('数据匹配错误:', error);
    return {
      success: false,
      error: `数据匹配错误: ${error instanceof Error ? error.message : String(error)}`,
      data: [] as ExcelData[],
      matched: 0,
      total: 0,
      unmatchedCount: 0
    };
  }
}

/**
 * 在Worker中创建Excel文件并返回二进制数据
 * @param data 要导出的数据
 * @returns Excel二进制数据
 */
function exportToExcel(data: ExcelData[]) {
  try {
    if (!data || data.length === 0) {
      throw new Error('没有数据可导出');
    }
    
    // 分批处理数据，减少内存占用
    const batchSize = 2000; // 减少批量大小
    const totalRows = data.length;
    
    console.log(`开始导出Excel, 总行数: ${totalRows}`);
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    try {
      // 检测数据大小，如果数据量太大，尝试分批处理
      if (totalRows > 5000) {
        console.log('数据量较大，使用分批处理');
        
        // 分批处理，一次处理一部分数据
        const totalBatches = Math.ceil(totalRows / batchSize);
        
        // 获取所有列名
        const allHeaders = new Set<string>();
        for (const row of data) {
          Object.keys(row).forEach(key => allHeaders.add(key));
        }
        const headers = Array.from(allHeaders);
        
        // 创建工作表数据结构 - 指定明确的类型
        const sheetData: Array<Array<string | number | null>> = [];
        
        // 添加表头
        sheetData.push(headers);
        
        // 分批添加数据行
        for (let i = 0; i < totalRows; i += batchSize) {
          const end = Math.min(i + batchSize, totalRows);
          console.log(`处理行 ${i + 1} 到 ${end}`);
          
          for (let j = i; j < end; j++) {
            const row = data[j];
            const rowData: Array<string | number | null> = headers.map(header => row[header] ?? null);
            sheetData.push(rowData);
          }
          
          // 使用setTimeout让处理不那么密集，但不使用await
          // 不在这里使用异步操作，因为函数不是async的
          if (i + batchSize < totalRows) {
            // 在生产环境可以考虑添加小的延迟，但这会让处理变慢
            // 这里仅做为示例，不实际使用
          }
        }
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, "数据结果");
      } else {
        // 数据量不大，直接处理
        console.log('数据量适中，直接处理');
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "数据结果");
      }
      
      console.log('工作表创建完成，准备写入');
      
      // 使用ArrayBuffer方式写入，比binary方式更稳定
      const excelData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      console.log(`Excel数据生成完成，大小: ${excelData.byteLength} 字节`);
      
      return {
        success: true,
        data: excelData,
        rowCount: totalRows
      };
    } catch (err) {
      console.error('Excel工作表创建错误:', err);
      throw new Error(`Excel创建失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  } catch (error) {
    console.error('导出Excel错误:', error);
    return {
      success: false,
      error: `导出失败: ${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}

/**
 * 将数据导出为CSV格式
 * @param data 要导出的数据
 * @returns CSV格式的文本数据
 */
function exportToCSV(data: ExcelData[]) {
  try {
    if (!data || data.length === 0) {
      throw new Error('没有数据可导出');
    }

    // 获取所有字段名
    const headers = Object.keys(data[0] || {});
    
    // 创建CSV内容
    let csvContent = '';
    
    // 添加BOM标记，确保Excel正确识别中文
    const BOM = '\uFEFF';
    csvContent += BOM;
    
    // 添加标题行
    csvContent += headers.join(',') + '\r\n';
    
    // 分批处理数据
    const batchSize = 1000;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min((batchIndex + 1) * batchSize, data.length);
      const batchData = data.slice(start, end);
      
      // 添加数据行
      for (const row of batchData) {
        const values = headers.map(header => {
          const value = row[header];
          
          // 处理不同类型的值
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string') {
            // 如果字符串包含逗号、引号或换行符，需要用引号括起来
            // 同时，将字符串中的引号替换为两个引号（CSV规范要求）
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          } else {
            return String(value);
          }
        });
        
        csvContent += values.join(',') + '\r\n';
      }
    }
    
    // 转换为Blob
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // 将Blob转换为ArrayBuffer返回
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          success: true,
          data: e.target?.result,
          rowCount: data.length,
          isCSV: true
        });
      };
      reader.readAsArrayBuffer(csvBlob);
    });
  } catch (error) {
    console.error('导出CSV错误:', error);
    return {
      success: false,
      error: `导出失败: ${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}

export {}; 