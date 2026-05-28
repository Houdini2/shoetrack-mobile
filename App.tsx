import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as SQLite from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Product = {
  id: number;
  model: string;
  brand: string;
  size: number;
  color: string;
  quantity: number;
  minStock: number;
  buyPrice: number;
  sellPrice: number;
  createdAt: string;
};

type Sale = {
  id: number;
  productId: number;
  model: string;
  brand: string;
  size: number;
  quantity: number;
  unitPrice: number;
  total: number;
  method: "Especes" | "Mobile Money" | "Carte";
  soldAt: string;
};

type ProductRow = {
  id: number;
  model: string;
  brand: string;
  size: number;
  color: string;
  quantity: number;
  min_stock: number;
  buy_price: number;
  sell_price: number;
  created_at: string;
};

type SaleRowData = {
  id: number;
  product_id: number;
  model: string;
  brand: string;
  size: number;
  quantity: number;
  unit_price: number;
  total: number;
  method: Sale["method"];
  sold_at: string;
};

type Stats = {
  lowStock: Product[];
  outOfStock: Product[];
  revenue: number;
  pairsSold: number;
  stockValue: number;
  totalStock: number;
  bestSeller: string;
};

type Tab = "home" | "inventory" | "sales" | "alerts" | "profile";

const DATABASE_NAME = "shoetrack.db";

const seedProducts = [
  ["Air Max 270", "Nike", 42, "Noir", 14, 4, 75000, 130000],
  ["Air Force 1", "Nike", 41, "Blanc", 7, 5, 65000, 110000],
  ["Dunk Low", "Nike", 40, "Vert", 5, 4, 72000, 125000],
  ["Ultraboost 22", "Adidas", 43, "Gris", 9, 4, 90000, 160000],
  ["Stan Smith", "Adidas", 40, "Blanc", 6, 5, 42000, 75000],
  ["Gazelle", "Adidas", 39, "Bleu", 4, 3, 48000, 85000],
  ["Old Skool", "Vans", 40, "Noir", 10, 3, 38000, 70000],
  ["Sk8-Hi", "Vans", 42, "Bordeaux", 4, 3, 41000, 76000],
  ["RS-X3", "Puma", 44, "Bleu", 5, 3, 52000, 89000],
  ["Suede Classic", "Puma", 41, "Rouge", 3, 3, 43000, 78000],
  ["Classic Jogger", "Reebok", 40, "Beige", 4, 3, 35000, 65000],
  ["Club C 85", "Reebok", 42, "Blanc", 6, 3, 39000, 72000],
  ["Chuck 70", "Converse", 41, "Ecru", 3, 3, 36000, 68000],
  ["Gel-Kayano", "Asics", 44, "Argent", 5, 2, 82000, 145000],
  ["574 Core", "New Balance", 43, "Marine", 4, 3, 58000, 99000],
] as const;

const seedSales = [
  [1, 2, 130000, "Carte", "2026-05-27T17:20:00.000Z"],
  [4, 1, 160000, "Mobile Money", "2026-05-27T14:05:00.000Z"],
  [7, 2, 70000, "Especes", "2026-05-26T09:22:00.000Z"],
  [2, 1, 110000, "Carte", "2026-05-26T16:10:00.000Z"],
  [5, 3, 75000, "Mobile Money", "2026-05-25T11:40:00.000Z"],
  [9, 2, 89000, "Especes", "2026-05-25T18:15:00.000Z"],
  [11, 4, 65000, "Mobile Money", "2026-05-24T10:30:00.000Z"],
  [13, 3, 68000, "Carte", "2026-05-23T15:50:00.000Z"],
  [10, 1, 78000, "Especes", "2026-05-23T12:05:00.000Z"],
  [14, 2, 145000, "Carte", "2026-05-22T19:10:00.000Z"],
  [15, 1, 99000, "Mobile Money", "2026-05-22T13:45:00.000Z"],
  [3, 1, 125000, "Especes", "2026-05-21T09:15:00.000Z"],
] as const;

function money(value: number) {
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    model: row.model,
    brand: row.brand,
    size: row.size,
    color: row.color,
    quantity: row.quantity,
    minStock: row.min_stock,
    buyPrice: row.buy_price,
    sellPrice: row.sell_price,
    createdAt: row.created_at,
  };
}

function toSale(row: SaleRowData): Sale {
  return {
    id: row.id,
    productId: row.product_id,
    model: row.model,
    brand: row.brand,
    size: row.size,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    total: row.total,
    method: row.method,
    soldAt: row.sold_at,
  };
}

async function migrateDb(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      brand TEXT NOT NULL,
      size INTEGER NOT NULL,
      color TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 1,
      buy_price INTEGER NOT NULL DEFAULT 0,
      sell_price INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total INTEGER NOT NULL,
      method TEXT NOT NULL,
      sold_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.runAsync("DELETE FROM users WHERE username <> ?", "root");
  await db.runAsync(
    "INSERT OR IGNORE INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
    "root",
    "root",
    "Administrateur",
    new Date().toISOString(),
  );

  const productCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM products");
  if ((productCount?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  for (const product of seedProducts) {
    await db.runAsync(
      "INSERT INTO products (model, brand, size, color, quantity, min_stock, buy_price, sell_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [...product, now],
    );
  }

  for (const sale of seedSales) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE products SET quantity = quantity - ? WHERE id = ?",
        sale[1],
        sale[0],
      );
      await db.runAsync(
        "INSERT INTO sales (product_id, quantity, unit_price, total, method, sold_at) VALUES (?, ?, ?, ?, ?, ?)",
        sale[0],
        sale[1],
        sale[2],
        sale[1] * sale[2],
        sale[3],
        sale[4],
      );
    });
  }
}

async function fetchProducts(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<ProductRow>("SELECT * FROM products ORDER BY model COLLATE NOCASE ASC, size ASC");
  return rows.map(toProduct);
}

async function fetchSales(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SaleRowData>(`
    SELECT sales.id, sales.product_id, products.model, products.brand, products.size,
      sales.quantity, sales.unit_price, sales.total, sales.method, sales.sold_at
    FROM sales
    JOIN products ON products.id = sales.product_id
    ORDER BY sales.sold_at DESC, sales.id DESC
  `);
  return rows.map(toSale);
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [authenticated, setAuthenticated] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async (database = db) => {
    if (!database) return;
    const [nextProducts, nextSales] = await Promise.all([fetchProducts(database), fetchSales(database)]);
    setProducts(nextProducts);
    setSales(nextSales);
  };

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await migrateDb(database);
        const [nextProducts, nextSales] = await Promise.all([fetchProducts(database), fetchSales(database)]);
        if (!mounted) return;
        setDb(database);
        setProducts(nextProducts);
        setSales(nextSales);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erreur SQLite");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo<Stats>(() => {
    const lowStock = products.filter((item) => item.quantity > 0 && item.quantity <= item.minStock);
    const outOfStock = products.filter((item) => item.quantity === 0);
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const pairsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const stockValue = products.reduce((sum, product) => sum + product.quantity * product.buyPrice, 0);
    const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
    const bestSeller = Object.entries(sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.model] = (acc[sale.model] ?? 0) + sale.quantity;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Aucune vente";
    return { lowStock, outOfStock, revenue, pairsSold, stockValue, totalStock, bestSeller };
  }, [products, sales]);

  const restock = async (productId: number, quantity = 5) => {
    if (!db) return;
    await db.runAsync("UPDATE products SET quantity = quantity + ? WHERE id = ?", quantity, productId);
    await reload(db);
  };

  const addProduct = async (input: Omit<Product, "id" | "createdAt">) => {
    if (!db) return "Base SQLite non initialisee";
    await db.runAsync(
      "INSERT INTO products (model, brand, size, color, quantity, min_stock, buy_price, sell_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      input.model.trim(),
      input.brand.trim(),
      input.size,
      input.color.trim(),
      input.quantity,
      input.minStock,
      input.buyPrice,
      input.sellPrice,
      new Date().toISOString(),
    );
    await reload(db);
    return "Article ajoute dans SQLite";
  };

  const addSale = async (productId: number, quantity: number, method: Sale["method"]) => {
    if (!db) return "Base SQLite non initialisee";
    const product = await db.getFirstAsync<ProductRow>("SELECT * FROM products WHERE id = ?", productId);
    if (!product) return "Article introuvable";
    if (product.quantity < quantity) return "Stock insuffisant";

    await db.withTransactionAsync(async () => {
      const update = await db.runAsync(
        "UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?",
        quantity,
        productId,
        quantity,
      );
      if (update.changes !== 1) {
        throw new Error("Stock insuffisant");
      }
      await db.runAsync(
        "INSERT INTO sales (product_id, quantity, unit_price, total, method, sold_at) VALUES (?, ?, ?, ?, ?, ?)",
        productId,
        quantity,
        product.sell_price,
        product.sell_price * quantity,
        method,
        new Date().toISOString(),
      );
    });
    await reload(db);
    return "Vente enregistree dans SQLite";
  };

  const login = async (username: string, password: string) => {
    if (!db) return false;
    const user = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM users WHERE lower(username) = lower(?) AND password = ? LIMIT 1",
      username.trim(),
      password,
    );
    return Boolean(user);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator color="#4F46E5" size="large" />
        <Text style={styles.loadingText}>Ouverture de la base SQLite...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Ionicons name="warning" size={34} color="#D83A3A" />
        <Text style={styles.errorTitle}>Erreur de demarrage</Text>
        <Text style={styles.muted}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return <LoginScreen login={login} onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BrandHeader alertCount={stats.lowStock.length + stats.outOfStock.length} />
          {tab === "home" ? <Home stats={stats} sales={sales} go={setTab} /> : null}
          {tab === "inventory" ? <Inventory products={products} lowStock={stats.lowStock} outOfStock={stats.outOfStock} restock={restock} addProduct={addProduct} /> : null}
          {tab === "sales" ? <Sales products={products} sales={sales} addSale={addSale} /> : null}
          {tab === "alerts" ? <Alerts stats={stats} sales={sales} restock={restock} /> : null}
          {tab === "profile" ? <Profile products={products} sales={sales} stockValue={stats.stockValue} onLogout={() => setAuthenticated(false)} /> : null}
        </ScrollView>
        <TabBar active={tab} onChange={setTab} />
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({ login, onLogin }: { login: (username: string, password: string) => Promise<boolean>; onLogin: () => void }) {
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("root");
  const [message, setMessage] = useState("Compte seed: root / root");

  const submit = async () => {
    if (await login(username, password)) {
      setMessage("Connexion reussie");
      onLogin();
      return;
    }
    setMessage("Identifiants incorrects. Utilisez root / root");
  };

  return (
    <SafeAreaView style={styles.loginSafe}>
      <StatusBar style="light" />
      <LinearGradient colors={["#1D2433", "#3730A3", "#0F766E"]} style={styles.loginHero}>
        <View style={styles.loginLogo}>
          <MaterialCommunityIcons name="shoe-sneaker" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.loginTitle}>ShoeTrack</Text>
        <Text style={styles.loginSubtitle}>Connexion boutique</Text>
      </LinearGradient>
      <View style={styles.loginPanel}>
        <Text style={styles.sectionTitle}>Se connecter</Text>
        <Text style={styles.muted}>Accedez a la gestion des articles, ventes et alertes SQLite.</Text>
        <Field label="Utilisateur" value={username} onChangeText={setUsername} placeholder="root" />
        <Field label="Mot de passe" value={password} onChangeText={setPassword} placeholder="root" secureTextEntry />
        <View style={styles.statusLine}>
          <Ionicons name="key" size={18} color="#4F46E5" />
          <Text style={styles.statusText}>{message}</Text>
        </View>
        <Button label="Connexion" icon="log-in" onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

function BrandHeader({ alertCount }: { alertCount: number }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.logoRow}>
        <LinearGradient colors={["#1D2433", "#4F46E5", "#14B8A6"]} style={styles.logoMark}>
          <MaterialCommunityIcons name="shoe-sneaker" size={26} color="#FFFFFF" />
          <View style={styles.logoDot} />
        </LinearGradient>
        <View>
          <Text style={styles.logoText}>ShoeTrack</Text>
          <Text style={styles.logoSub}>SQLite, stock, ventes</Text>
        </View>
      </View>
      <Pill label={`${alertCount} alertes`} tone={alertCount ? "warning" : "success"} icon={alertCount ? "alert-circle" : "checkmark-circle"} />
    </View>
  );
}

function Home({ stats, sales, go }: { stats: Stats; sales: Sale[]; go: (tab: Tab) => void }) {
  return (
    <>
      <Header title="Tableau de bord" subtitle="Suivi local du magasin avec une base SQLite embarquee." />
      <LinearGradient colors={["#1D2433", "#3730A3", "#0F766E"]} style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <Text style={styles.heroLabel}>Chiffre d'affaires</Text>
            <Text style={styles.heroValue}>{money(stats.revenue)}</Text>
            <Text style={styles.heroCaption}>Historique enregistre dans SQLite</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="cash" size={25} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.heroStats}>
          <MiniMetric label="Paires vendues" value={`${stats.pairsSold}`} />
          <MiniMetric label="Stock total" value={`${stats.totalStock}`} />
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        <MetricCard icon="file-tray-stacked" label="Stock disponible" value={`${stats.totalStock}`} tone="info" />
        <MetricCard icon="star" label="Top modele" value={stats.bestSeller} tone="success" />
        <MetricCard icon="wallet" label="Valeur stock" value={money(stats.stockValue)} tone="neutral" />
        <MetricCard icon="warning" label="A recharger" value={`${stats.lowStock.length + stats.outOfStock.length}`} tone="warning" />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionGrid}>
          <Action icon="add-circle" label="Nouvelle vente" onPress={() => go("sales")} />
          <Action icon="albums" label="Articles" onPress={() => go("inventory")} />
          <Action icon="bar-chart" label="Rapport" onPress={() => go("alerts")} />
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Dernieres ventes</Text>
          <Pill label={`${sales.length} lignes`} tone="info" />
        </View>
        {sales.slice(0, 4).map((sale) => <SaleLine key={sale.id} sale={sale} />)}
      </Card>
    </>
  );
}

function Inventory({ products, lowStock, outOfStock, restock, addProduct }: {
  products: Product[];
  lowStock: Product[];
  outOfStock: Product[];
  restock: (id: number) => Promise<void>;
  addProduct: (input: Omit<Product, "id" | "createdAt">) => Promise<string>;
}) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    model: "",
    brand: "",
    size: "42",
    color: "",
    quantity: "1",
    minStock: "3",
    buyPrice: "30000",
    sellPrice: "50000",
  });
  const [status, setStatus] = useState("Les nouveaux articles sont sauvegardes en SQLite.");
  const filtered = products.filter((product) =>
    `${product.model} ${product.brand} ${product.size} ${product.color}`.toLowerCase().includes(query.toLowerCase()),
  );

  const submit = async () => {
    if (!form.model.trim() || !form.brand.trim() || !form.color.trim()) {
      setStatus("Modele, marque et couleur sont obligatoires");
      return;
    }
    const payload = {
      model: form.model,
      brand: form.brand,
      color: form.color,
      size: Number(form.size) || 0,
      quantity: Math.max(0, Number(form.quantity) || 0),
      minStock: Math.max(1, Number(form.minStock) || 1),
      buyPrice: Math.max(0, Number(form.buyPrice) || 0),
      sellPrice: Math.max(0, Number(form.sellPrice) || 0),
    };
    if (!payload.size || !payload.sellPrice) {
      setStatus("Pointure et prix de vente doivent etre valides");
      return;
    }
    setStatus(await addProduct(payload));
    setQuery("");
    setForm((current) => ({ ...current, model: "", brand: "", color: "" }));
  };

  return (
    <>
      <Header title="Articles" subtitle="Ajouter, rechercher, suivre le stock et les seuils de reapprovisionnement." />
      <Card>
        <Text style={styles.inputLabel}>Recherche</Text>
        <View style={styles.inputBox}>
          <Ionicons name="search" size={18} color="#647282" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Nike, 42, blanc..." placeholderTextColor="#647282" style={styles.input} />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Nouvel article</Text>
        <View style={styles.formGrid}>
          <Field grid label="Modele" value={form.model} onChangeText={(value) => setForm({ ...form, model: value })} placeholder="Air Max" />
          <Field grid label="Marque" value={form.brand} onChangeText={(value) => setForm({ ...form, brand: value })} placeholder="Nike" />
          <Field grid label="Couleur" value={form.color} onChangeText={(value) => setForm({ ...form, color: value })} placeholder="Noir" />
          <Field grid label="Pointure" value={form.size} onChangeText={(value) => setForm({ ...form, size: value })} keyboardType="numeric" />
          <Field grid label="Stock" value={form.quantity} onChangeText={(value) => setForm({ ...form, quantity: value })} keyboardType="numeric" />
          <Field grid label="Seuil" value={form.minStock} onChangeText={(value) => setForm({ ...form, minStock: value })} keyboardType="numeric" />
          <Field grid label="Prix achat" value={form.buyPrice} onChangeText={(value) => setForm({ ...form, buyPrice: value })} keyboardType="numeric" />
          <Field grid label="Prix vente" value={form.sellPrice} onChangeText={(value) => setForm({ ...form, sellPrice: value })} keyboardType="numeric" />
        </View>
        <View style={styles.statusLine}>
          <Ionicons name="server" size={18} color="#4F46E5" />
          <Text style={styles.statusText}>{status}</Text>
        </View>
        <Button label="Ajouter l'article" icon="save" onPress={submit} />
      </Card>

      <View style={styles.summaryRow}>
        <Summary label="Articles" value={`${products.length}`} tone="info" icon="albums" />
        <Summary label="Stock faible" value={`${lowStock.length}`} tone="warning" icon="warning" />
        <Summary label="Rupture" value={`${outOfStock.length}`} tone="danger" icon="close-circle" />
      </View>

      {filtered.map((product) => {
        const isOut = product.quantity === 0;
        const isLow = product.quantity > 0 && product.quantity <= product.minStock;
        return (
          <Card key={product.id}>
            <View style={styles.productTop}>
              <View style={styles.productIcon}>
                <MaterialCommunityIcons name="shoe-sneaker" size={24} color="#4F46E5" />
              </View>
              <View style={styles.flex}>
                <Text style={styles.productName}>{product.model}</Text>
                <Text style={styles.muted}>{product.brand} · T{product.size} · {product.color}</Text>
              </View>
              <Pill label={isOut ? "rupture" : isLow ? "faible" : "ok"} tone={isOut ? "danger" : isLow ? "warning" : "success"} />
            </View>
            <View style={styles.productNumbers}>
              <Info label="Stock" value={`${product.quantity}`} />
              <Info label="Seuil" value={`${product.minStock}`} />
              <Info label="Prix" value={money(product.sellPrice)} />
            </View>
            <Button label="Recharger +5" icon="add" secondary onPress={() => restock(product.id)} />
          </Card>
        );
      })}
    </>
  );
}

function Sales({ products, sales, addSale }: {
  products: Product[];
  sales: Sale[];
  addSale: (id: number, quantity: number, method: Sale["method"]) => Promise<string>;
}) {
  const available = products.filter((item) => item.quantity > 0);
  const [productId, setProductId] = useState<number | null>(available[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<Sale["method"]>("Mobile Money");
  const [status, setStatus] = useState("Pret a enregistrer une vente");
  const selected = available.find((item) => item.id === productId) ?? available[0];
  const maxQuantity = selected?.quantity ?? 0;
  const safeQuantity = selected ? Math.min(quantity, maxQuantity) : 0;
  const total = selected ? selected.sellPrice * safeQuantity : 0;

  useEffect(() => {
    if (!available.some((product) => product.id === productId)) {
      setProductId(available[0]?.id ?? null);
      setQuantity(1);
    }
  }, [available, productId]);

  const submit = async () => {
    if (!selected) return;
    setStatus(await addSale(selected.id, safeQuantity, method));
    setQuantity(1);
  };

  return (
    <>
      <Header title="Ventes" subtitle="Une vente validee est inscrite dans SQLite et decremente le stock." />
      <Card dark>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <Text style={styles.heroLabel}>Total vente</Text>
            <Text style={styles.heroValue}>{money(total)}</Text>
            <Text style={styles.heroCaption}>{selected ? `${selected.model} · T${selected.size} · x${safeQuantity}` : "Aucun stock"}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="receipt" size={25} color="#FFFFFF" />
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Article</Text>
          <Pill label={`${available.length} disponibles`} tone="info" />
        </View>
        <View style={styles.choiceWrap}>
          {available.map((product) => (
            <Chip key={product.id} label={`${product.model} T${product.size}`} active={selected?.id === product.id} onPress={() => setProductId(product.id)} />
          ))}
        </View>
        <Text style={styles.sectionTitle}>Quantite</Text>
        <View style={styles.stepper}>
          <Button label="-1" secondary onPress={() => setQuantity((current) => Math.max(1, current - 1))} />
          <View style={styles.qtyBox}>
            <Text style={styles.qtyValue}>{safeQuantity}</Text>
            <Text style={styles.muted}>sur {maxQuantity} en stock</Text>
          </View>
          <Button label="+1" secondary onPress={() => setQuantity((current) => Math.min(maxQuantity, current + 1))} />
        </View>
        <Text style={styles.sectionTitle}>Paiement</Text>
        <View style={styles.methodRow}>
          {(["Especes", "Mobile Money", "Carte"] as const).map((item) => (
            <Chip key={item} label={item} active={method === item} onPress={() => setMethod(item)} />
          ))}
        </View>
        <View style={styles.statusLine}>
          <Ionicons name="information-circle" size={18} color="#4F46E5" />
          <Text style={styles.statusText}>{status}</Text>
        </View>
        <Button label="Valider la vente" icon="checkmark" onPress={submit} disabled={!selected || safeQuantity < 1} />
      </Card>
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Historique SQLite</Text>
          <Pill label={`${sales.length} ventes`} tone="info" />
        </View>
        <Text style={styles.muted}>Toutes les ventes enregistrees sont affichees ci-dessous.</Text>
        {sales.map((sale) => <SaleLine key={sale.id} sale={sale} />)}
      </Card>
    </>
  );
}

function Alerts({ stats, sales, restock }: { stats: Stats; sales: Sale[]; restock: (id: number) => Promise<void> }) {
  const topSales = [...sales].sort((a, b) => b.total - a.total).slice(0, 3);
  return (
    <>
      <Header title="Alertes & rapport" subtitle="Ruptures, stock faible et meilleures ventes." />
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Ruptures de stock</Text>
          <Pill label={`${stats.outOfStock.length}`} tone={stats.outOfStock.length ? "danger" : "success"} />
        </View>
        {stats.outOfStock.length ? stats.outOfStock.map((product) => (
          <AlertRow key={product.id} product={product} danger restock={restock} />
        )) : <Text style={styles.muted}>Aucune rupture.</Text>}
      </Card>
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Stock faible</Text>
          <Pill label={`${stats.lowStock.length}`} tone={stats.lowStock.length ? "warning" : "success"} />
        </View>
        {stats.lowStock.length ? stats.lowStock.map((product) => (
          <AlertRow key={product.id} product={product} restock={restock} />
        )) : <Text style={styles.muted}>Aucun stock faible.</Text>}
      </Card>
      <Card soft>
        <View style={styles.reportTop}>
          <View style={styles.flex}>
            <Text style={styles.inputLabel}>Rapport TP</Text>
            <Text style={styles.reportValue}>{money(stats.revenue)}</Text>
            <Text style={styles.muted}>{sales.length} ventes persistantes</Text>
          </View>
          <View style={styles.reportIcon}>
            <Ionicons name="bar-chart" size={26} color="#4F46E5" />
          </View>
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Top ventes</Text>
        {topSales.map((sale, index) => <SaleLine key={sale.id} sale={sale} rank={index + 1} />)}
      </Card>
    </>
  );
}

function Profile({ products, sales, stockValue, onLogout }: { products: Product[]; sales: Sale[]; stockValue: number; onLogout: () => void }) {
  return (
    <>
      <Header title="ShoeTrack Mobile" subtitle="TP gestion d'une boutique de chaussures" />
      <Card dark>
        <View style={styles.profileCard}>
          <LinearGradient colors={["#4F46E5", "#14B8A6"]} style={styles.avatar}>
            <MaterialCommunityIcons name="shoe-sneaker" size={26} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.flex}>
            <Text style={styles.darkTitle}>Application locale SQLite</Text>
            <Text style={styles.darkText}>Aucun backend obligatoire: articles, ventes et alertes sont gardes dans le telephone.</Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Magasin</Text>
        <InfoRow icon="storefront" label="Boutique" value="ShoeTrack Cotonou" />
        <InfoRow icon="file-tray-stacked" label="References" value={`${products.length} articles suivis`} />
        <InfoRow icon="cart" label="Ventes" value={`${sales.length} ventes enregistrees`} />
        <InfoRow icon="wallet" label="Valeur stock" value={money(stockValue)} />
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Fonctions du TP</Text>
        <InfoRow icon="server" label="Base de donnees" value="SQLite embarquee avec tables products et sales" />
        <InfoRow icon="notifications" label="Alertes" value="Rupture et stock faible actifs" />
        <InfoRow icon="cash" label="Paiements" value="Especes, Mobile Money, Carte" />
      </Card>
      <Button label="Deconnexion" icon="log-out" secondary onPress={onLogout} />
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Card({ children, dark, soft }: { children: React.ReactNode; dark?: boolean; soft?: boolean }) {
  return <View style={[styles.card, dark && styles.cardDark, soft && styles.cardSoft]}>{children}</View>;
}

function Pill({ label, tone, icon }: {
  label: string;
  tone: "success" | "warning" | "danger" | "info";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const palette = {
    success: ["#D7F8E8", "#057A55"],
    warning: ["#FFF3D6", "#92400E"],
    danger: ["#FFE2E2", "#D83A3A"],
    info: ["#E6E8FF", "#4F46E5"],
  } as const;
  const [backgroundColor, color] = palette[tone];
  return (
    <View style={[styles.pill, { backgroundColor }]}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function Button({ label, onPress, secondary, icon, disabled }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, disabled && styles.buttonDisabled, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={18} color={secondary ? "#1D2433" : "#FFFFFF"} /> : null}
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, grid }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  secureTextEntry?: boolean;
  grid?: boolean;
}) {
  return (
    <View style={grid ? styles.fieldGrid : styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#647282"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.fieldInput}
      />
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: "info" | "success" | "warning" | "neutral" }) {
  const bg = tone === "success" ? "#D7F8E8" : tone === "warning" ? "#FFF3D6" : tone === "info" ? "#E6E8FF" : "#F1F4FA";
  const fg = tone === "success" ? "#057A55" : tone === "warning" ? "#92400E" : tone === "info" ? "#4F46E5" : "#1D2433";
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color="#1D2433" />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function Summary({ label, value, tone, icon }: { label: string; value: string; tone: "info" | "warning" | "danger"; icon: keyof typeof Ionicons.glyphMap }) {
  const palette = {
    info: ["#E6E8FF", "#4F46E5"],
    warning: ["#FFF3D6", "#92400E"],
    danger: ["#FFE2E2", "#D83A3A"],
  } as const;
  const [backgroundColor, color] = palette[tone];
  return (
    <View style={styles.summary}>
      <View style={[styles.summaryIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.summaryLabel, { color }]} numberOfLines={2}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={18} color="#1D2433" /></View>
      <View style={styles.flex}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function SaleLine({ sale, rank }: { sale: Sale; rank?: number }) {
  return (
    <View style={styles.saleRow}>
      <View style={styles.saleIcon}>
        {rank ? <Text style={styles.rankText}>{rank}</Text> : <MaterialCommunityIcons name="shoe-sneaker" size={20} color="#4F46E5" />}
      </View>
      <View style={styles.flex}>
        <Text style={styles.saleTitle}>{sale.model}</Text>
        <Text style={styles.muted}>{sale.brand} · T{sale.size} · x{sale.quantity} · {sale.method}</Text>
      </View>
      <Text style={styles.saleAmount}>{money(sale.total)}</Text>
    </View>
  );
}

function AlertRow({ product, danger, restock }: { product: Product; danger?: boolean; restock: (id: number) => Promise<void> }) {
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertIcon, { backgroundColor: danger ? "#FFE2E2" : "#FFF3D6" }]}>
        <Ionicons name={danger ? "close-circle" : "warning"} size={20} color={danger ? "#D83A3A" : "#92400E"} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.saleTitle}>{product.model}</Text>
        <Text style={styles.muted}>{product.brand} · T{product.size} · seuil {product.minStock}</Text>
      </View>
      <View style={styles.alertSide}>
        <Text style={styles.alertQty}>{product.quantity} paire(s)</Text>
        <Button label="+5" secondary onPress={() => restock(product.id)} />
      </View>
    </View>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: "home", label: "Accueil", icon: "home" },
    { key: "inventory", label: "Articles", icon: "file-tray-stacked" },
    { key: "sales", label: "Ventes", icon: "cart" },
    { key: "alerts", label: "Alertes", icon: "alert-circle" },
    { key: "profile", label: "Profil", icon: "person-circle" },
  ];
  return (
    <View style={styles.tabs}>
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.tab}>
            <Ionicons name={item.icon} size={23} color={isActive ? "#1D2433" : "#647282"} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB", paddingTop: 8 },
  loginSafe: { flex: 1, backgroundColor: "#F6F7FB" },
  loginHero: { minHeight: 230, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 30, justifyContent: "flex-end", gap: 8 },
  loginLogo: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  loginTitle: { color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900" },
  loginSubtitle: { color: "rgba(255,255,255,0.76)", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  loginPanel: { margin: 20, marginTop: -34, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, gap: 14, borderWidth: 1, borderColor: "rgba(29,36,51,0.07)" },
  centerScreen: { flex: 1, backgroundColor: "#F6F7FB", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  loadingText: { color: "#1D2433", fontSize: 15, fontWeight: "800" },
  errorTitle: { color: "#D83A3A", fontSize: 20, fontWeight: "900" },
  shell: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 112, gap: 20 },
  flex: { flex: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  logoMark: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  logoDot: { position: "absolute", right: 8, top: 8, width: 9, height: 9, borderRadius: 99, backgroundColor: "#F59E0B", borderWidth: 1, borderColor: "#FFFFFF" },
  logoText: { color: "#141723", fontSize: 24, lineHeight: 28, fontWeight: "900" },
  logoSub: { color: "#647282", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  header: { gap: 3 },
  title: { color: "#141723", fontSize: 27, lineHeight: 33, fontWeight: "900" },
  subtitle: { color: "#647282", fontSize: 15, lineHeight: 22, fontWeight: "500" },
  heroCard: { borderRadius: 30, padding: 20, gap: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 16, fontWeight: "800", textTransform: "uppercase" },
  heroValue: { color: "#FFFFFF", fontSize: 29, lineHeight: 36, fontWeight: "900" },
  heroCaption: { color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  heroIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  heroStats: { flexDirection: "row", gap: 12 },
  miniMetric: { flex: 1, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", padding: 16 },
  miniValue: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  miniLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { flexBasis: "47%", flexGrow: 1, minHeight: 145, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "rgba(29,36,51,0.07)" },
  metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  metricLabel: { color: "#647282", fontSize: 12, lineHeight: 18, marginTop: 12, fontWeight: "600" },
  metricValue: { color: "#141723", fontSize: 18, lineHeight: 24, fontWeight: "900" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "rgba(29,36,51,0.07)", gap: 14 },
  cardDark: { backgroundColor: "#1D2433" },
  cardSoft: { backgroundColor: "#EEF2FF" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  sectionTitle: { color: "#141723", fontSize: 18, lineHeight: 24, fontWeight: "900" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  action: { flexGrow: 1, flexBasis: 96, minHeight: 72, borderRadius: 17, backgroundColor: "#F1F4FA", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  actionText: { color: "#141723", fontSize: 12, lineHeight: 16, fontWeight: "800", textAlign: "center" },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 140 },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  inputLabel: { color: "#647282", fontSize: 12, lineHeight: 16, fontWeight: "800", textTransform: "uppercase" },
  inputBox: { minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: "#E0E4EF", backgroundColor: "#FFFFFF", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, color: "#141723", fontSize: 15, lineHeight: 22, fontWeight: "500" },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  field: { width: "100%", flexGrow: 0, flexShrink: 0, gap: 6 },
  fieldGrid: { flexGrow: 1, flexBasis: "47%", gap: 6 },
  fieldInput: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#E0E4EF", backgroundColor: "#FFFFFF", paddingHorizontal: 12, color: "#141723", fontSize: 14, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 10 },
  summary: { flex: 1, minHeight: 116, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "rgba(29,36,51,0.07)", justifyContent: "space-between" },
  summaryIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontSize: 12, lineHeight: 15, fontWeight: "900" },
  summaryValue: { color: "#141723", fontSize: 25, lineHeight: 30, fontWeight: "900" },
  productTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  productIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#E6E8FF", alignItems: "center", justifyContent: "center" },
  productName: { color: "#141723", fontSize: 18, lineHeight: 24, fontWeight: "900" },
  muted: { color: "#647282", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  productNumbers: { flexDirection: "row", gap: 8 },
  infoBox: { flex: 1, borderRadius: 17, backgroundColor: "#F1F4FA", padding: 12 },
  infoValue: { color: "#141723", fontSize: 15, lineHeight: 22, fontWeight: "900" },
  button: { minHeight: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16, backgroundColor: "#1D2433" },
  buttonSecondary: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#D8DDFD" },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22, fontWeight: "900", flexShrink: 1, textAlign: "center" },
  buttonTextSecondary: { color: "#1D2433" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 15, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F4FA", borderWidth: 1, borderColor: "#E0E4EF" },
  chipActive: { backgroundColor: "#1D2433", borderColor: "#1D2433" },
  chipText: { color: "#1D2433", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  chipTextActive: { color: "#FFFFFF" },
  stepper: { flexDirection: "row", gap: 12, alignItems: "center" },
  qtyBox: { flex: 1, minHeight: 62, borderRadius: 17, backgroundColor: "#F1F4FA", alignItems: "center", justifyContent: "center" },
  qtyValue: { color: "#141723", fontSize: 27, fontWeight: "900" },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 17, backgroundColor: "#E6E8FF", padding: 12 },
  statusText: { color: "#4F46E5", fontSize: 12, lineHeight: 18, fontWeight: "800", flex: 1 },
  saleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E0E4EF" },
  saleIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#E6E8FF", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#057A55", fontSize: 13, fontWeight: "900" },
  saleTitle: { color: "#141723", fontSize: 15, lineHeight: 22, fontWeight: "900" },
  saleAmount: { color: "#141723", fontSize: 12, lineHeight: 16, fontWeight: "900", maxWidth: 108, textAlign: "right" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E0E4EF" },
  alertIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  alertSide: { alignItems: "flex-end", gap: 8, maxWidth: 112 },
  alertQty: { color: "#141723", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  reportTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  reportValue: { color: "#141723", fontSize: 27, lineHeight: 33, fontWeight: "900" },
  reportIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#E6E8FF", alignItems: "center", justifyContent: "center" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  darkTitle: { color: "#FFFFFF", fontSize: 18, lineHeight: 24, fontWeight: "900" },
  darkText: { color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E0E4EF" },
  infoIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#F1F4FA", alignItems: "center", justifyContent: "center" },
  infoRowValue: { color: "#141723", fontSize: 15, lineHeight: 22, fontWeight: "900", flexShrink: 1 },
  tabs: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 76, flexDirection: "row", backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E0E4EF", paddingTop: 8, paddingBottom: 12 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabText: { color: "#647282", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  tabTextActive: { color: "#1D2433" },
});
