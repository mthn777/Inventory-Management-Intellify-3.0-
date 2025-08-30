// import React, { useState } from 'react';
// import { X, Eye, EyeOff, Mail, Lock, User, Phone, Building } from 'lucide-react';

// function Login({ isOpen, onClose, onLoginSuccess }) {
//   const [isSignUp, setIsSignUp] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//     confirmPassword: '',
//     firstName: '',
//     lastName: '',
//     phone: '',
//     company: ''
//   });

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (isSignUp && formData.password !== formData.confirmPassword) {
//       alert('Passwords do not match!');
//       return;
//     }
    
//     // Here you would typically handle the authentication
//     console.log('Form submitted:', formData);
    
//     // Call the success callback to redirect to dashboard
//     if (onLoginSuccess) {
//       onLoginSuccess(formData);
//     }
    
//     onClose();
//   };

//   const resetForm = () => {
//     setFormData({
//       email: '',
//       password: '',
//       confirmPassword: '',
//       firstName: '',
//       lastName: '',
//       phone: '',
//       company: ''
//     });
//   };

//   const toggleMode = () => {
//     setIsSignUp(!isSignUp);
//     resetForm();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       {/* Backdrop */}
//       <div 
//         className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
//         onClick={onClose}
//       />
      
//       {/* Modal */}
//       <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
//         {/* Header */}
//         <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white text-center">
//           <button
//             onClick={onClose}
//             className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-colors"
//           >
//             <X className="h-5 w-5" />
//           </button>
          
//           <div className="flex items-center justify-center mb-3">
//             <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
//               <span className="text-white font-bold text-xl">T</span>
//             </div>
//             <span className="ml-3 text-xl font-bold">TechCraft</span>
//           </div>
          
//           <h2 className="text-lg font-semibold">
//             {isSignUp ? 'Create Your Account' : 'Welcome Back'}
//           </h2>
//           <p className="text-blue-100 text-sm">
//             {isSignUp ? 'Join thousands of developers' : 'Sign in to your account'}
//           </p>
//         </div>

//         {/* Form */}
//         <div className="p-6">
//           <form onSubmit={handleSubmit} className="space-y-3">
//             {isSignUp && (
//               <>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-1">
//                       First Name
//                     </label>
//                     <div className="relative">
//                       <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                       <input
//                         type="text"
//                         name="firstName"
//                         value={formData.firstName}
//                         onChange={handleInputChange}
//                         className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                         placeholder="John"
//                         required
//                       />
//                     </div>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-1">
//                       Last Name
//                     </label>
//                     <div className="relative">
//                       <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                       <input
//                         type="text"
//                         name="lastName"
//                         value={formData.lastName}
//                         onChange={handleInputChange}
//                         className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                         placeholder="Doe"
//                         required
//                       />
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-1">
//                       Phone Number
//                     </label>
//                     <div className="relative">
//                       <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                       <input
//                         type="tel"
//                         name="phone"
//                         value={formData.phone}
//                         onChange={handleInputChange}
//                         className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                         placeholder="+91 123-456-7890"
//                         required
//                       />
//                     </div>
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-1">
//                       Company
//                     </label>
//                     <div className="relative">
//                       <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                       <input
//                         type="text"
//                         name="company"
//                         value={formData.company}
//                         onChange={handleInputChange}
//                         className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                         placeholder="Your Company"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </>
//             )}

//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                                   <input
//                     type="email"
//                     name="email"
//                     value={formData.email}
//                     onChange={handleInputChange}
//                     className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                     placeholder="john@example.com"
//                     required
//                   />
//               </div>
//             </div>

//                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
//               <div>
//                 <label className="block text-sm font-medium text-slate-700 mb-1">
//                   Password
//                 </label>
//                 <div className="relative">
//                   <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     name="password"
//                     value={formData.password}
//                     onChange={handleInputChange}
//                     className="w-full pl-10 pr-12 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                     placeholder="••••••••"
//                     required
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                   >
//                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </div>
//               </div>

//               {isSignUp && (
//                 <div>
//                   <label className="block text-sm font-medium text-slate-700 mb-1">
//                     Confirm Password
//                 </label>
//                   <div className="relative">
//                     <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
//                     <input
//                       type={showConfirmPassword ? "text" : "password"}
//                       name="confirmPassword"
//                       value={formData.confirmPassword}
//                       onChange={handleInputChange}
//                       className="w-full pl-10 pr-12 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
//                       placeholder="••••••••"
//                       required
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                     >
//                       {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {!isSignUp && (
//               <div className="flex items-center justify-between">
//                 <label className="flex items-center">
//                   <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
//                   <span className="ml-2 text-sm text-slate-600">Remember me</span>
//                 </label>
//                 <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
//                   Forgot password?
//                 </button>
//               </div>
//             )}

//             <button
//               type="submit"
//               className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
//             >
//               {isSignUp ? 'Create Account' : 'Sign In'}
//             </button>
//           </form>

//           {/* Toggle Mode */}
//           <div className="mt-4 text-center">
//             <p className="text-slate-600">
//               {isSignUp ? 'Already have an account?' : "Don't have an account?"}
//               <button
//                 onClick={toggleMode}
//                 className="ml-1 text-blue-600 hover:text-blue-700 font-semibold"
//               >
//                 {isSignUp ? 'Sign In' : 'Sign Up'}
//               </button>
//             </p>
//           </div>

//           {/* Social Login */}
//           <div className="mt-4">
//             <div className="relative">
//               <div className="absolute inset-0 flex items-center">
//                 <div className="w-full border-t border-slate-300" />
//               </div>
//               <div className="relative flex justify-center text-sm">
//                 <span className="px-2 bg-white text-slate-500">Or continue with</span>
//               </div>
//             </div>

//             <div className="mt-4 grid grid-cols-2 gap-3">
//               <button className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
//                 <svg className="h-5 w-5" viewBox="0 0 24 24">
//                   <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
//                   <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
//                   <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
//                   <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
//                 </svg>
//                 <span className="ml-2">Google</span>
//               </button>
//               <button className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
//                 <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
//                 </svg>
//                 <span className="ml-2">Twitter</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Login; 





import { Mail, Lock } from "lucide-react";
import React, { useState } from "react";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login submitted:", form);
    // here you can call Firebase Auth or your backend API
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-slate-800">
          Admin Login
        </h2>
        <p className="text-center text-slate-500 text-sm mb-6">
          Sign in to manage the system
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
