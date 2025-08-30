// import React, { useState } from "react";
// import QRCode from "qrcode.react";

// const Qrcode = () => {
//   const [input, setInput] = useState("");
//   const [qrValue, setQrValue] = useState("");

//   const handleGenerate = () => {
//     if (!input.trim()) {
//       alert("Please enter some text or product ID to generate QR!");
//       return;
//     }
//     setQrValue(input);
//   };

//   return (
//     <div className="p-6 max-w-md mx-auto bg-white shadow-lg rounded-xl text-center">
//       <h2 className="text-lg font-semibold mb-4">QR Code Generator</h2>

//       <input
//         type="text"
//         placeholder="Enter Product ID / Name / Any text"
//         value={input}
//         onChange={(e) => setInput(e.target.value)}
//         className="w-full px-3 py-2 border rounded-md mb-3"
//       />

//       <button
//         onClick={handleGenerate}
//         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//       >
//         Generate QR Code
//       </button>

//       {qrValue && (
//         <div className="mt-6 flex flex-col items-center">
//           <QRCode value={qrValue} size={200} />
//           <p className="mt-3 text-gray-600">QR for: {qrValue}</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Qrcode;
