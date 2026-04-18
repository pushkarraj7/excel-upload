"use client";
import { useState } from "react";
import apiMethods from "../services/apiService/apiMethods";
import { API_URLS } from "../services/apiService/apiUrls";
import './style.css'

export default function ExcelUploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [date, setDate] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        try {
            setLoading(true);
            e.preventDefault();

            if (!file) {
                alert("Please select price excel file");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);   // MUST match multer field
            // formData.append("date", date);   // price date
            const res = await apiMethods.post(API_URLS.UPLOAD_COMPANIES_PRICES, formData);

            if (!res.error) {
                alert("Price Added successfully")
                setFile(null);
            }

        } catch (error) {
            console.error("API error", error);
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="card">

            {loading && (
                <div className="loader-container">
                    <div className="loader" />
                    <p>Uploading Price...</p>
                </div>
            )}

            <h2>Upload Price Data Excel</h2>

            <form className="form" onSubmit={submit}>
                {/* <div className="form-group">
                    <label>Price Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div> */}

                <div className="form-group">
                    <label>Price Excel File</label>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </div>

                <button type="submit">Upload Daily Price Data</button>
            </form>
        </div>
    );
}