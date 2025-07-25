import axios from "axios";

const axiosInstance = axios.create({
	baseURL: "https://backend-ecom-fwoc.onrender.com",
	withCredentials: true, // send cookies to the server
	headers: {
	'Content-Type': 'application/json',
	'Accept': 'application/json'
	}
});

export default axiosInstance;
