import ExcelJS from 'exceljs';

/**
 * Generates an Excel file buffer from data.
 * @param {string} sheetName - Name of the worksheet.
 * @param {Array<Object>} columns - column definitions { header, key, width }.
 * @param {Array<Object>} rows - Data rows.
 * @returns {Promise<Buffer>}
 */
export const generateExcel = async (sheetName, columns, rows) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;

    // Add rows
    worksheet.addRows(rows);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    return await workbook.xlsx.writeBuffer();
};
