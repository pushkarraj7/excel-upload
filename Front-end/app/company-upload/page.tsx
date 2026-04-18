"use client";

import { useState } from "react";
import apiMethods from "../services/apiService/apiMethods";
import { API_URLS } from "../services/apiService/apiUrls";
import './company-upload.css'

export default function CompanyUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        try {
            setLoading(true);
            e.preventDefault();

            if (!file) {
                alert("Please select excel file");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            const res = await apiMethods.post(API_URLS.UPLOAD_COMPANIES, formData);

            if (!res.error) {
                alert("Company excel uploaded successfully")
                setFile(null);
            }

        } catch (error) {
            console.error("API error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="page">

            {loading && (
                <div className="loader-container">
                    <div className="loader" />
                    <p>Uploading Companies...</p>
                </div>
            )}

            <div className="container">
                {/* Header */}
                <div className="header">
                    <h1>Company Excel Upload</h1>
                    <p>Upload company master data using excel</p>
                </div>

                {/* Upload Card */}
                <div className="card">
                    <h2>Upload Company Excel</h2>

                    <form className="form" onSubmit={submit}>
                        {/* <div className="form-group">
              <label>Upload Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div> */}

                        <div className="form-group">
                            <label>Company Excel File</label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </div>

                        <button type="submit">Upload Company Excel</button>
                    </form>
                </div>
            </div>
        </main>
    );
}
