import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', async (client) => {
  await client.query('SET search_path TO trading, public;');
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const productTemplates = [
  {
    category: '相机',
    titles: [
      '佳能 EOS R6',
      '索尼 A7C',
      '富士 X-T4',
      '尼康 Z6 II',
      '奥林巴斯 OM-1',
      '徕卡 Q2',
      '松下 S5',
      '适马 fp',
      '哈苏 X2D',
      '宾得 K-3 III',
      '佳能 5D4',
      '索尼 A7R5',
      '富士 GFX 100S',
      '尼康 D850',
      '徕卡 M11',
    ],
    descriptions: [
      '成色95新，快门次数不足5000，配件齐全',
      '自用相机，保护完好，无拆无修',
      '专业级微单，画质优秀，适合专业拍摄',
      '全画幅传感器，高感表现出色',
      '轻便易携带，适合旅行和街拍',
    ],
    prices: [30, 50, 80, 100, 120, 150, 200],
    deposits: [1000, 2000, 3000, 4000, 5000, 8000],
  },
  {
    category: '数码产品',
    titles: [
      'MacBook Air M2',
      'MacBook Pro 16寸',
      'iPad Air 5',
      'Surface Pro 9',
      'Dell XPS 13',
      'iPhone 15 Pro',
      'Samsung Galaxy S24',
      'Sony WH-1000XM5',
      'AirPods Pro 2',
      'Switch OLED',
      'PS5 光驱版',
      'Xbox Series X',
      'Steam Deck OLED',
      'ThinkPad X1 Carbon',
      'LG Gram 17',
    ],
    descriptions: [
      '配置强劲，办公游戏两不误',
      '轻薄便携，续航超长',
      '屏幕素质优秀，适合影音娱乐',
      '性能强悍，适合专业工作',
      '自用设备，保养良好',
    ],
    prices: [40, 60, 80, 120, 150],
    deposits: [2000, 3000, 4000, 5000, 6000],
  },
  {
    category: '家具',
    titles: [
      '北欧风餐桌',
      '真皮办公椅',
      '实木书架',
      '懒人沙发',
      '茶几组合',
      '双人床架',
      '床头柜一对',
      '书桌电脑桌',
      '衣柜储物柜',
      '电视柜组合',
      '吧台椅',
      '化妆台',
      '鞋柜玄关柜',
      '餐桌椅套装',
      '休闲椅',
    ],
    descriptions: [
      '现代简约风格，适合各类家居',
      '实木打造，质感优秀',
      '使用舒适，设计合理',
      '搬家急售，价格实惠',
      '成色很新，无明显划痕',
    ],
    prices: [15, 20, 25, 30, 40, 50],
    deposits: [200, 300, 500, 800, 1000],
  },
  {
    category: '运动器材',
    titles: [
      '公路自行车',
      '山地自行车',
      '瑜伽垫套装',
      '哑铃组合',
      '跑步机',
      '动感单车',
      '椭圆机',
      '史密斯架',
      '划船机',
      '滑板长板',
      '滑雪板双板',
      '露营帐篷',
      '登山背包',
      '羽毛球拍',
      '网球拍',
    ],
    descriptions: [
      '运动健身必备，保持好身材',
      '户外探险装备，专业可靠',
      '使用频率低，成色很好',
      '品牌产品，质量保证',
      '适合初学者入门',
    ],
    prices: [20, 30, 40, 50, 80],
    deposits: [300, 500, 800, 1000, 1500],
  },
  {
    category: '图书',
    titles: [
      '三体全集',
      '人类简史',
      '活着',
      '百年孤独',
      '1984',
      '追风筝的人',
      '小王子',
      '围城',
      '红楼梦',
      '三国演义',
      '代码大全',
      '设计模式',
      '深入理解计算机系统',
      '算法导论',
      'JavaScript高级程序设计',
    ],
    descriptions: [
      '经典好书，值得反复阅读',
      '个人藏书，保存完好',
      '技术书籍，提升自我',
      '文学名著，陶冶情操',
      '全新未拆封，塑封还在',
    ],
    prices: [5, 8, 10, 15, 20],
    deposits: [50, 100, 150, 200],
  },
];

const images = [
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
  'https://images.unsplash.com/photo-1617005591028-675f866a34c7?w=400',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
  'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('开始生成50条商品数据...');

  // 获取现有分类和用户
  const categories = await prisma.category.findMany();
  const users = await prisma.user.findMany();

  if (categories.length === 0) {
    console.error('错误：没有找到分类数据，请先运行 seed.ts');
    return;
  }

  if (users.length === 0) {
    console.error('错误：没有找到用户数据，请先运行 seed.ts');
    return;
  }

  console.log(`找到 ${categories.length} 个分类，${users.length} 个用户`);

  const products = [];

  for (let i = 0; i < 50; i++) {
    const template = randomItem(productTemplates);
    const category = categories.find((c) => c.name === template.category) || categories[0];
    const user = randomItem(users);

    const product = await prisma.product.create({
      data: {
        title: randomItem(template.titles),
        description: randomItem(template.descriptions),
        price: randomItem(template.prices),
        deposit: randomItem(template.deposits),
        images: [randomItem(images)],
        status: randomItem(['available', 'available', 'available', 'rented']),
        userId: user.id,
        categoryId: category.id,
      },
      include: {
        category: true,
        user: { select: { id: true, nickname: true } },
      },
    });

    products.push(product);
    console.log(`已创建 ${i + 1}/50: ${product.title}`);
  }

  console.log(`\n✅ 成功创建 ${products.length} 条商品数据！`);

  const stats = await prisma.product.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('商品状态统计:', stats);
}

main()
  .catch((e) => {
    console.error('生成失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
