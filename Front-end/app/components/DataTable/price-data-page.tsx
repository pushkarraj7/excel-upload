import { useEffect, useMemo, useState } from "react";
import PriceDataTable from "./DataTable";
import PriceFilters from "./Pricefilter";
import "./datatable.scss";
import apiMethods from "@/app/services/apiService/apiMethods";
import { API_URLS } from "@/app/services/apiService/apiUrls";
import * as XLSX from "xlsx";

export default function PriceDataPage() {
  const [apiResponse, setApiResponse] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState({
    index1: "",
    index2: "",
    index3: "",
    marketCap: "",
    startDate: "",
    endDate: ""
  });
  const [filterOptions, setFilterOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // const average = async () => {
  //     const res = await apiMethods.get(API_URLS.CALCULATE_AVERAGE());
  //     setApiResponse(res?.data || []);
  // };

  // useEffect(() => {
  //     average();
  // }, []);

  const PAGE_SIZE = 10; // one symbol per page

  const paginatedSymbols = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return apiResponse.slice(start, start + PAGE_SIZE);
    // return apiResponse
  }, [apiResponse, page]);

  const totalPages = Math.ceil(apiResponse.length / PAGE_SIZE);

  // Filter options

  // 🔹 Fetch Filter Options
  const fetchFilterOptions = async () => {
    const res = await apiMethods.get(API_URLS.INDEX_FILTER);
    setFilterOptions(res);
  };

  // 🔹 Fetch Data Based On Filter
  const fetchData = async () => {
    setLoading(true);

    const query = new URLSearchParams();

    if (selected.index1) query.append("index1", selected.index1);
    if (selected.index2) query.append("index2", selected.index2);
    if (selected.index3) query.append("index3", selected.index3);
    if (selected.marketCap) query.append("marketCap", selected.marketCap);
    if (selected.startDate) query.append("startDate", selected.startDate);
    if (selected.endDate) query.append("endDate", selected.endDate);

    const url = `${API_URLS.CALCULATE_AVERAGE}?${query.toString()}`;

    const res = await apiMethods.get(url);

    setApiResponse(res?.data || []);
    setLoading(false);
  };


  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selected]);

  const handleChange = (key: string, value: string) => {
    setSelected((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setSelected({
      index1: "",
      index2: "",
      index3: "",
      marketCap: "",
      startDate: "",
      endDate: ""
    });
  };

  const handleDownloadExcel = () => {
    if (!apiResponse || apiResponse.length === 0) return;

    const sheetData: any[] = [];

    apiResponse.forEach(company => {
      company.rows.forEach((row: any) => {
        sheetData.push({
          Symbol: company.symbol,
          "Market Cap": company.marketCap,
          "Index 1": company.index1,
          "Index 2": company.index2,
          "Index 3": company.index3,
          Date: row.date,
          "Close Price": row.closePrice,
          "EMA 11": row.ema11,
          "EMA 22": row.ema22,
          "Cross 11/22": row.cross11_22,
          "EMA 13": row.ema13,
          "EMA 34": row.ema34,
          "Cross 13/34": row.cross13_34,
          "EMA 50": row.ema50
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Price Data");

    XLSX.writeFile(workbook, "Price_Data.xlsx");
  };

  return (
    <div className="price-container">
      <h2>Price Data</h2>

      {/* 🔽 FILTER SECTION */}
      {filterOptions && (
        <div className="filters">
          {/* Index 1 */}
          <select
            value={selected.index1}
            onChange={(e) => handleChange("index1", e.target.value)}
          >
            <option value="">Select Index 1</option>
            {filterOptions.index1.map((item: string) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {/* Index 2 */}
          <select
            value={selected.index2}
            onChange={(e) => handleChange("index2", e.target.value)}
          >
            <option value="">Select Index 2</option>
            {filterOptions.index2.map((item: string) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {/* Index 3 */}
          <select
            value={selected.index3}
            onChange={(e) => handleChange("index3", e.target.value)}
          >
            <option value="">Select Index 3</option>
            {filterOptions.index3.map((item: string) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={selected.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            placeholder="Start Date"
            title="Optional Start Date"
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "auto", minWidth: "140px" }}
          />
          <input
            type="date"
            value={selected.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
            placeholder="End Date"
            title="Optional End Date"
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "auto", minWidth: "140px" }}
          />

          <button
            className="clear-filter-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>

          <button
            className="clear-filter-btn"
            style={{ backgroundColor: "#2e7d32", color: "white" }}
            onClick={handleDownloadExcel}
            title="Download current data as Excel"
          >
            Export to Excel
          </button>
        </div>
      )}

      {loading && <p>Loading...</p>}

      {!loading && apiResponse.length === 0 && (
        <div className="no-data-table">
          <div className="no-data-content">
            No Data Found
          </div>
        </div>
      )}


      {!loading && apiResponse.length > 0 &&
        paginatedSymbols.map((item) => (
          <PriceDataTable
            key={item.symbol}
            symbol={item.symbol}
            marketCap={item.marketCap}
            index1={item.index1}
            index2={item.index2}
            index3={item.index3}
            rows={item.rows}
          />
        ))}

      {apiResponse.length > PAGE_SIZE && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

    </div>
  );

}
