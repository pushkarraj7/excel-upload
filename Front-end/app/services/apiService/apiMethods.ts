// services/apiService.ts

import apiClient from "./apiClient";

/**
 * Optional global loader hooks
 * Replace with Zustand / Redux / Context later
 */
const setGlobalLoading = (state: boolean) => {
    // example: store.dispatch(setLoading(state))
};

// GET
const get = async (
    url: string,
    params: any = {},
    config: any = {}
) => {
    try {
        setGlobalLoading(true);

        const response = await apiClient.get(url, {
            params,
            ...config,
        });

        return response.data;
    } catch (error: any) {
        return {
            error: true,
            message:
                error?.response?.data?.message || "Something went wrong.",
        };
    } finally {
        setGlobalLoading(false);
    }
};

// POST
const post = async (
    url: string,
    data: any = {},
    config: any = {}
) => {
    try {
        setGlobalLoading(true);

        // Handle FormData automatically
        if (data instanceof FormData) {
            config.headers = {
                ...(config.headers || {}),
                "Content-Type": "multipart/form-data",
            };
        }

        const response = await apiClient.post(url, data, config);
        return response.data;
    } catch (error: any) {
        return {
            error: true,
            message:
                error?.response?.data?.message || "Something went wrong.",
        };
    } finally {
        setGlobalLoading(false);
    }
};

const apiMethods = {
    get,
    post
}
export default apiMethods;
