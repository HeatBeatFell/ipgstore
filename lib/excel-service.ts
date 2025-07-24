import * as XLSX from 'xlsx';

// 定义数据类型
export interface CostData {
  [key: string]: string | number | null;
}

export interface OrderData {
  [key: string]: string | number | null;
}

export interface ProcessResult {
  success: boolean;
  data?: Array<Record<string, string | number | null>>;
  error?: string;
}

/**
 * 读取Excel文件并转换为JSON数据
 * @param file Excel文件
 * @returns 解析后的数据数组
 */
export const readExcelFile = async (file: File): Promise<Array<Record<string, string | number | null>>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('文件读取失败');
        }
        
        // 读取工作簿
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Array<Record<string, string | number | null>>;
        
        if (jsonData.length === 0) {
          throw new Error('Excel文件中没有数据');
        }
        
        resolve(jsonData);
      } catch (err) {
        console.error('Excel解析错误:', err);
        reject(err);
      }
    };
    
    reader.onerror = (error) => {
      console.error('文件读取错误:', error);
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 将成本表和订单表进行匹配合并
 * @param costData 成本表数据
 * @param orderData 订单表数据
 * @param costMerchantCodeField 成本表中的商家编码字段
 * @param orderMerchantCodeField 订单表中的商家编码字段
 * @param costValueField 成本表中的成本值字段
 * @returns 合并后的数据
 */
export const matchCostAndOrder = (
  costData: CostData[],
  orderData: OrderData[],
  costMerchantCodeField: string,
  orderMerchantCodeField: string,
  costValueField: string
): ProcessResult => {
  try {
    if (!costData || !orderData || costData.length === 0 || orderData.length === 0) {
      return {
        success: false,
        error: '数据为空，无法处理'
      };
    }
    
    if (!costMerchantCodeField || !orderMerchantCodeField || !costValueField) {
      return {
        success: false,
        error: '匹配字段未指定'
      };
    }
    
    console.log(`匹配字段 - 成本表商家编码: ${costMerchantCodeField}, 订单表商家编码: ${orderMerchantCodeField}, 成本值字段: ${costValueField}`);
    
    // 创建成本表的查找映射，商家编码 -> 成本值
    const costMap = new Map<string, string | number | null>();
    costData.forEach(costItem => {
      const merchantCode = String(costItem[costMerchantCodeField] || '');
      const costValue = costItem[costValueField];
      
      if (merchantCode) {
        costMap.set(merchantCode.trim().toLowerCase(), costValue);
      }
    });
    
    console.log(`成本映射表创建完成，共 ${costMap.size} 项`);
    
    // 为订单数据添加成本列
    const result = orderData.map(orderItem => {
      const resultItem = { ...orderItem };
      
      // 获取订单的商家编码
      const orderMerchantCode = String(orderItem[orderMerchantCodeField] || '');
      
      if (orderMerchantCode) {
        // 尝试查找对应成本
        const costValue = costMap.get(orderMerchantCode.trim().toLowerCase());
        
        // 添加成本字段到结果中
        resultItem[costValueField] = costValue !== undefined ? costValue : null;
      } else {
        resultItem[costValueField] = null;
      }
      
      return resultItem;
    });
    
    console.log(`数据合并完成，共处理 ${result.length} 条记录`);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('数据匹配错误:', error);
    return {
      success: false,
      error: `处理失败: ${(error as Error).message}`
    };
  }
};

/**
 * 将数据导出为Excel文件
 * @param data 要导出的数据
 * @param filename 文件名
 */
export const exportToExcel = async (
  data: Array<Record<string, string | number | null>>,
  filename: string
): Promise<void> => {
  try {
    // 添加最小延时，确保loading状态能够显示
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, "数据结果");
    
    // 导出Excel文件
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    // 添加一点延时，让用户感受到处理过程
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`文件导出成功: ${filename}.xlsx`);
  } catch (error) {
    console.error('导出Excel失败:', error);
    throw error;
  }
}; 