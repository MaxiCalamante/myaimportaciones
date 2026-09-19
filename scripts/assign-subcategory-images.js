const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gqcdurxndbeeugjfworx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY2R1cnhuZGJlZXVnamZ3b3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM3NTAsImV4cCI6MjA5NzI3OTc1MH0.dpdv4l25RNr0DKp7MmI5c6PQDfQ5ahqtfhxOdEsalbo'
);

async function assignImages() {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, image_url');

  const withoutImage = categories.filter((c) => !c.image_url);
  console.log(`Subcategories needing images: ${withoutImage.length}`);

  for (const cat of withoutImage) {
    // Find a product in this category with an image
    const { data: products } = await supabase
      .from('products')
      .select('id, title, image_url')
      .eq('category_id', cat.id)
      .not('image_url', 'is', null)
      .order('is_featured', { ascending: false })
      .limit(1);

    if (products && products.length > 0 && products[0].image_url) {
      const selectedImg = products[0].image_url;
      const { error } = await supabase
        .from('categories')
        .update({ image_url: selectedImg })
        .eq('id', cat.id);

      if (error) {
        console.error(`Error updating ${cat.name}:`, error.message);
      } else {
        console.log(`✓ ${cat.name} -> ${selectedImg} (from "${products[0].title}")`);
      }
    } else {
      console.log(`! No product found for ${cat.name}`);
    }
  }

  console.log('\nSubcategory image assignment complete!');
}

assignImages().catch(console.error);
