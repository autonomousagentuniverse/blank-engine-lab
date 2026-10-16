from pathlib import Path
from PIL import Image,ImageDraw
root=Path("artifacts/human-01")
views=["negative_y","positive_y","three_quarter","face_front","face_three_quarter"]
items=[]
for view in views:
 p=root/("human01-webgl-"+view+".png")
 with Image.open(p) as im:
  rgb=im.convert("RGB");rgb.thumbnail((960,820))
  cell=Image.new("RGB",(980,865),"#20252e")
  cell.paste(rgb,((980-rgb.width)//2,36))
  ImageDraw.Draw(cell).text((16,13),"HUMAN-01 REAL Blank Engine WebGL · "+view,fill="#eef1fa")
  items.append(cell)
page=Image.new("RGB",(1960,865*3),"#20252e")
for i,item in enumerate(items):page.paste(item,((i%2)*980,(i//2)*865))
page.save(root/"human01-new-real-webgl-contact-sheet.jpg",quality=88)
print("HUMAN01_REAL_RENDER_CONTACT_SHEET",len(items))
