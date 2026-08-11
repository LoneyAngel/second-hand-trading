// 在 useEffect 拿到数据后执行
// Image.getSize(
//   'https://example.com/dynamic-img.jpg',
//   (width, height) => {
//     // 1. 在这里你成功拿到了图片的真实原始宽高（比如 1200x800）
//     console.log('真实宽:', width, '真实高:', height);

//     // 2. 你可以算一个比例存进 state 里，让界面根据这个比例去动态撑开
//     const ratio = width / height;
//     setImageRatio(ratio);
//   },
//   (error) => {
//     console.error('图片加载失败:', error);
//   }
// );
