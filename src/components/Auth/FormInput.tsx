interface FormInputProps {
  type: string;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  required?: boolean;
}

const FormInput = ({ type, placeholder, value, onChange, name, required }: FormInputProps) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      className="w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
    />
  );
};

export default FormInput;
