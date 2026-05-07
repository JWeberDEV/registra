import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Category, InsertCategory, TransactionType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Check, X } from "lucide-react";
import "./category-modal.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PlusIcon, MoreVertical, PencilIcon, Trash2Icon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTheme } from "next-themes";

const categorySchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  cor: z.string().min(1, "Cor é obrigatória"),
  icone: z.string().min(1, "Ícone é obrigatório"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// Componentes customizados para os dropdowns
interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function CustomSelect({ label, value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const selectedOption = options.find(option => option.value === value);
  
  return (
    <div className="category-form-field" ref={selectRef}>
      <label className="category-label">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="category-select-trigger"
      >
        {selectedOption ? (
          <span>{selectedOption.label}</span>
        ) : (
          <span style={{ color: '#9ca3af' }}>Selecione {label.toLowerCase()}</span>
        )}
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="category-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`category-dropdown-item ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {value === option.value && <Check size={16} className="mr-2" />}
              <span style={{ marginLeft: value === option.value ? '0' : '24px' }}>
                {option.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CustomColorSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: { value: string; label: string }[];
}

function CustomColorSelect({ label, value, onChange, colors }: CustomColorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const selectedColor = colors.find(color => color.value === value);
  
  return (
    <div className="category-form-field" ref={selectRef}>
      <label className="category-label">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="category-select-trigger"
      >
        {selectedColor ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div 
              className="color-circle" 
              style={{ backgroundColor: selectedColor.value }}
            ></div>
            {selectedColor.label}
          </div>
        ) : (
          <span style={{ color: '#9ca3af' }}>Selecione a cor</span>
        )}
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="category-dropdown">
          {colors.map((color) => (
            <div
              key={color.value}
              className={`category-dropdown-item ${value === color.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(color.value);
                setIsOpen(false);
              }}
            >
              {value === color.value && <Check size={16} className="mr-2" />}
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: value === color.value ? '0' : '24px' }}>
                <div 
                  className="color-circle" 
                  style={{ backgroundColor: color.value }}
                ></div>
                {color.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CustomIconSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icons: { value: string; label: string }[];
}

function CustomIconSelect({ label, value, onChange, icons }: CustomIconSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const selectedIcon = icons.find(icon => icon.value === value);
  
  return (
    <div className="category-form-field" ref={selectRef}>
      <label className="category-label">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="category-select-trigger"
      >
        {selectedIcon ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <i className={`ri-${selectedIcon.value}-line icon-display`}></i>
            {selectedIcon.label}
          </div>
        ) : (
          <span style={{ color: '#9ca3af' }}>Selecione o ícone</span>
        )}
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="category-dropdown">
          {icons.map((icon) => (
            <div
              key={icon.value}
              className={`category-dropdown-item ${value === icon.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(icon.value);
                setIsOpen(false);
              }}
            >
              {value === icon.value && <Check size={16} className="mr-2" />}
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: value === icon.value ? '0' : '24px' }}>
                <i className={`ri-${icon.value}-line icon-display`}></i>
                {icon.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const { toast } = useToast();
  const { theme } = useTheme();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const { data: categories, isLoading, refetch } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nome: "",
      tipo: TransactionType.EXPENSE,
      cor: "#6C63FF",
      icone: "tag",
    },
  });

  const filteredCategories = categories?.filter((category) => {
    const matchesType = typeFilter === "all" || category.tipo === typeFilter;
    const matchesSearch = searchQuery === "" || 
      category.nome.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          data: data
        });
        toast({
          title: "Categoria atualizada",
          description: "A categoria foi atualizada com sucesso.",
        });
      } else {
        await apiRequest("/api/categories", {
          method: "POST",
          data: data
        });
        toast({
          title: "Categoria criada",
          description: "A categoria foi criada com sucesso.",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a categoria.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await apiRequest(`/api/categories/${id}`, {
        method: "DELETE"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
      setDeletingCategory(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a categoria.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      nome: category.nome,
      tipo: category.tipo,
      cor: category.cor || "#6C63FF",
      icone: category.icone || "tag",
    });
    setIsDialogOpen(true);
  };

  const openNewCategoryDialog = () => {
    setEditingCategory(null);
    form.reset({
      nome: "",
      tipo: TransactionType.EXPENSE,
      cor: "#6C63FF",
      icone: "tag",
    });
    setIsDialogOpen(true);
  };

  // Available icons for categories
  const icons = [
    { value: "home", label: "Casa" },
    { value: "car", label: "Carro" },
    { value: "food", label: "Alimentação" },
    { value: "health", label: "Saúde" },
    { value: "school", label: "Educação" },
    { value: "entertainment", label: "Lazer" },
    { value: "clothing", label: "Roupas" },
    { value: "services", label: "Serviços" },
    { value: "salary", label: "Salário" },
    { value: "freelance", label: "Freelance" },
    { value: "investments", label: "Investimentos" },
    { value: "gift", label: "Presente" },
    { value: "refund", label: "Reembolso" },
    { value: "misc-income", label: "Outras Receitas" },
    { value: "misc-expense", label: "Outros Gastos" },
    { value: "tag", label: "Tag" }
  ];

  // Available colors for categories
  const colors = [
    { value: "#FF5733", label: "Vermelho" },
    { value: "#3498DB", label: "Azul" },
    { value: "#F1C40F", label: "Amarelo" },
    { value: "#2ECC71", label: "Verde" },
    { value: "#9B59B6", label: "Roxo" },
    { value: "#E67E22", label: "Laranja" },
    { value: "#1ABC9C", label: "Turquesa" },
    { value: "#34495E", label: "Azul Escuro" },
    { value: "#95A5A6", label: "Cinza" },
    { value: "#6C63FF", label: "Roxo (Primário)" },
    { value: "#00FF9D", label: "Verde Neon (Secundário)" }
  ];

  const getIconComponent = (iconName: string) => {
    return <i className={`ri-${iconName}-line`}></i>;
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 md:mb-0"
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Categorias</h1>
            <p className="text-gray-400">Gerencie as categorias de transações</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button onClick={openNewCategoryDialog} className="neon-border">
              <PlusIcon className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </motion.div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={`glass-card neon-border rounded-2xl ${theme === 'light' ? 'bg-white border border-gray-200' : ''}`}
      >
        <div className="p-5">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar categorias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-dark-purple/10"
              />
            </div>
            <div>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-[140px] bg-dark-purple/10 h-10 rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value={TransactionType.INCOME}>Receitas</option>
                <option value={TransactionType.EXPENSE}>Despesas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full py-4 text-center">Carregando...</div>
            ) : filteredCategories?.length === 0 ? (
              <div className="col-span-full py-4 text-center">Nenhuma categoria encontrada</div>
            ) : (
              filteredCategories?.map((category) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl p-4 flex items-center justify-between category-card-container transition-colors duration-200 ${theme === 'light' ? 'bg-white border border-gray-200 hover:bg-primary/10' : 'glass-card'}`}
                >
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mr-4"
                      style={{ backgroundColor: category.cor || "#6C63FF" }}
                    >
                      {category.icone ? (
                        getIconComponent(category.icone)
                      ) : (
                        <i className="ri-price-tag-3-line"></i>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-medium ${theme === 'light' ? 'text-gray-900' : ''}`}>{category.nome}</h3>
                      <span className={`text-xs ${theme === 'light' ? (category.tipo === TransactionType.INCOME ? 'text-green-600' : 'text-red-600') : (category.tipo === TransactionType.INCOME ? 'text-green-400' : 'text-red-400')}`}>
                        {category.tipo}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    {!category.global && (
                      <div className="relative">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${theme === 'light' ? 'text-gray-500 hover:text-gray-900' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === category.id ? null : category.id);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {openMenuId === category.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div 
                              className={`absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg z-50 ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-slate-800 border border-slate-600'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  openEditDialog(category);
                                  setOpenMenuId(null);
                                }}
                                className={`flex items-center w-full px-3 py-2 text-sm rounded-t-md ${theme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-slate-700'}`}
                              >
                                <PencilIcon className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingCategory(category);
                                  setOpenMenuId(null);
                                }}
                                className={`flex items-center w-full px-3 py-2 text-sm rounded-b-md ${theme === 'light' ? 'text-red-600 hover:bg-gray-100' : 'text-red-400 hover:bg-slate-700'}`}
                              >
                                <Trash2Icon className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {category.global && (
                      <span className={`text-xs px-2 py-1 rounded-full ${theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-primary/20'}`}>Global</span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {isDialogOpen && (
        <div className="category-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsDialogOpen(false)}>
          <div className="category-modal-content">
            <button 
              className="category-modal-close"
              onClick={() => setIsDialogOpen(false)}
            >
              <X size={24} />
            </button>
            
            <div className="category-modal-title">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </div>
            <div className="category-modal-description">
              {editingCategory
                ? "Edite os detalhes da categoria abaixo."
                : "Preencha os detalhes para criar uma nova categoria."}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="category-form-field">
                <label className="category-label">Nome</label>
                <input
                  className="category-input"
                  placeholder="Nome da categoria"
                  value={form.watch("nome") || ""}
                  onChange={(e) => form.setValue("nome", e.target.value)}
                />
              </div>

              <CustomSelect
                label="Tipo"
                value={form.watch("tipo")}
                onChange={(value: string) => form.setValue("tipo", value)}
                options={[
                  { value: TransactionType.EXPENSE, label: "Despesa" },
                  { value: TransactionType.INCOME, label: "Receita" }
                ]}
              />

              <CustomColorSelect
                label="Cor"
                value={form.watch("cor")}
                onChange={(value: string) => form.setValue("cor", value)}
                colors={colors}
              />

              <CustomIconSelect
                label="Ícone"
                value={form.watch("icone")}
                onChange={(value: string) => form.setValue("icone", value)}
                icons={icons}
              />

              <div className="category-modal-buttons">
                <button 
                  type="button" 
                  className="category-btn category-btn-secondary"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="category-btn category-btn-primary">
                  {editingCategory ? "Salvar alterações" : "Criar categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
              <br />
              <br />
              <strong>Atenção:</strong> Se esta categoria estiver sendo usada em transações,
              você não poderá excluí-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingCategory && handleDeleteCategory(deletingCategory.id)}
              className="bg-destructive"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
