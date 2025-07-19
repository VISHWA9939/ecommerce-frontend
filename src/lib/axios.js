import axios from "axios";

const axiosInstance = axios.create({
	baseURL: "http://localhost:5000/api",
	withCredentials: true, // send cookies to the server
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
});

export default axiosInstance;
