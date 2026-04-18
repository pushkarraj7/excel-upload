import axios from "axios";
import { Company } from "../types/company";

const api = axios.create({
  baseURL: "/api",
});

export const uploadExcel = async (
  data: Company[],
  uploadDate: string
) => {
  return api.post("/upload", {
    uploadDate,
    data,
  });
};

export const getExcelData = async () => {
  return api.get("/upload");
};
