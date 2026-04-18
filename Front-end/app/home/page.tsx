"use client";

import { useState, useEffect } from "react";
import ExcelUploadForm from "@/app/components/ExcelUploadForm";
import { SummaryCards } from "@/app/components/SummaryCards";
// import { ChartsSection } from "@/app/components/Charts/ChartsSection";
import { Company } from "@/app/types/company";
import apiMethods from "../services/apiService/apiMethods";
import { API_URLS } from "../services/apiService/apiUrls";
import PriceDataPage from "../components/DataTable/price-data-page";
import ChartsPage from "../components/Charts/charts-page";
import { useRouter } from "next/navigation";
interface CompanyStat {
    totalCompanies: number;
}

export default function HomePage() {
    const router = useRouter();
    const [data, setData] = useState<CompanyStat | null>(null);
    const [totalCompanies, setTotalCompanies] = useState(0)

    const count = async () => {
        const res = await apiMethods.get(API_URLS.COMPANY_STATS)
        setData(res.data);
        setTotalCompanies(res.data?.totalCompanies ?? 0)
    }

    useEffect(() => {
        count();
    }, [])

    return (
        <main className="page">
            <div className="container">
                <div className="header">
                    <div className="d-flex" style={{display: "flex", justifyContent: 'space-between'}}>
                        <div className="heading-container">
                            <h1>Excel Upload Dashboard</h1>
                            <p>Upload, analyze and visualize company data</p>
                        </div>

                        <div className="button-container">
                            <button className="custom-btn" onClick={() => router.push('/company-upload')}>Upload Company</button>
                        </div>

                    </div>
                </div>

                <div className="top-grid">
                    <ExcelUploadForm />
                    <SummaryCards
                        totalCompanies={totalCompanies}
                    // totalAmount={data}
                    />
                </div>

            </div>

            <PriceDataPage />
            {/* <ChartsPage /> */}



        </main>
    );
}
