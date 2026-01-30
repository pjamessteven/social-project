/**
 * Vietnamese question categories and featured questions for detrans.ai
 * 
 * Ghi chú về Thuật ngữ Liên quan đến Giới tính:
 * 
 * - "Giới tính sinh học" (Sex) = giới tính sinh học (giải phẫu, nhiễm sắc thể, sinh sản,
 *   các đặc điểm bất biến)
 * 
 * - "Giới" (Gender) = giới xã hội (vai trò, hành vi, các thuộc tính mà xã hội cho là phù hợp
 *   với nam và nữ dựa trên giới tính sinh học của họ)
 * 
 * - "Bản dạng giới" (Gender identity) = cảm nhận nội tâm về việc là nam, nữ, hoặc ở giữa
 * 
 * - "Không tuân thủ giới (GNC - Gender non-conformity)" = khi một ngườihành động/thể hiện
 *   khác biệt với mong đợi của xã hội dựa trên giới tính sinh học của họ
 * 
 * - "AFAB/AMAB" = được gán giới tính nữ/nam khi sinh (dựa trên giới tính sinh học quan sát được)
 *   - AFAB (Assigned Female At Birth): Được gán là nữ khi sinh
 *   - AMAB (Assigned Male At Birth): Được gán là nam khi sinh
 * 
 * - "Chuyển giới/trans" (Transgender/trans) = nhận dạng với một giới khác với giới tính sinh học
 *   của họ
 * 
 * - "Hủy bỏ chuyển giới" (Detransition) = ngừng nhận dạng là chuyển giới và/hoặc đảo ngược
 *   các bước chuyển giới
 * 
 * - "Từ bỏ" (Desist) = khi ai đó từng nhận dạng là chuyển giới (không có can thiệp y tế)
 *   không còn nhận dạng là chuyển giới nữa
 * 
 * - "Song tính" (Intersex) = ngườicó đặc điểm sinh học không hoàn toàn nam hoặc nữ
 * 
 * - "Không nhị phân" (Non-binary) = nhận dạng giới không hoàn toàn là nam hoặc nữ
 * 
 * - "Đồng tính nữ/nam" (Lesbian/Gay) = ngườithu hút về tình dục/tình cảm với ngườicùng giới
 * 
 * - "Song tính luyến ái" (Bisexual) = ngườithu hút với nhiều giới tính
 * 
 * - "Đa dạng giới" (Gender diversity) = sự đa dạng trong cách thể hiện và trải nghiệm giới tính
 * 
 * Phân biệt quan trọng: Khái niệm khó chịu về giới (gender dysphoria) dựa trên việc hiểu rằng
 * giới tính sinh học và giới xã hội là khác nhau. Không tuân thủ giới (không phù hợp với khuôn mẫu)
 * khác với việc có bản dạng giới khác với giới tính sinh học.
 * 
 * Về văn hóa Việt Nam:
 * - Thuật ngữ "giới tính" trong tiếng Việt thường dùng chung cho cả sex và gender
 * - Cần phân biệt rõ "giới tính sinh học" (sex) và "giới" (gender)
 * - Khái niệm chuyển giới ngày càng được hiểu rộng rãi nhưng vẫn còn nhiều định kiến
 * - Cộng đồng LGBT+ tại Việt Nam đang phát triển nhưng vẫn đối mặt với thách thức
 */

export const questionCategories = [
  {
    title: "Câu hỏi Nổi bật",
    description: "Những câu hỏi tốt nhất để hỏi ngườihủy bỏ chuyển giới.",
    questions: [
      "Chuyển giới có nghĩa là gì?",
      "Ngườichuyển giới có tồn tại từ xa xưa không?",
      "Có đúng là chỉ 1% ngườichuyển giới hủy bỏ chuyển giới không?",
      "Thuốc ức chế dậy thì có thể đảo ngược được không?",
      "Bằng chứng nào tồn tại cho các giao thức y tế khẳng định giới?",
      "Thuật ngữ 'trứng' (egg) trong cộng đồng chuyển giới có nghĩa là gì?",
      "Những hàm ý của câu chuyện 'sinh ra đã như vậy' là gì?",
      "Làm thế nào các nhãn không nhị phân củng cố các khuôn mẫu giới truyền thống?",
      "Sự khác biệt giữa giới tính sinh học và giới là gì?",
      "Khó chịu về giới là gì và điều gì có thể gây ra nó?",
      "Tại sao một số ngườiquyết định hủy bỏ chuyển giới?",
      "Bạn bè hoặc gia đình có thể hỗ trợ ngườimuốn chuyển giới như thế nào?",
      "Bạn bè hoặc gia đình có thể hỗ trợ ngườimuốn hủy bỏ chuyển giới như thế nào?",
      "Có phổ biến không khi ngườihủy bỏ chuyển giới hối hận về việc đã chuyển giới?",
      "Tại sao một số ngườiquyết định chuyển giới lại sau khi hủy bỏ?",
      "Những câu chuyện của ngườihủy bỏ chuyển giới có thể dạy tôi điều gì, ngay cả khi quá trình chuyển giới của tôi đang diễn ra tốt đẹp?",
      "Làm sao tôi biết được nếu những nghi ngờ chỉ là lo lắng hay là dấu hiệu tôi nên dừng lại?",
      "Tại sao các câu chuyện của ngườichuyển giới về lý do ngườihủy bỏ chuyển giới lại khác với những ngườithực sự đã hủy bỏ?",
      "Ngườihủy bỏ chuyển giới có nghĩ rằng việc chuyển giới là xấu không?",
      "Những tuyên bố sai lầm nào được đưa ra về ngườichuyển giới?",
      "Những tuyên bố sai lầm nào được đưa ra về ngườđã hủy bỏ chuyển giới?",
      "Những dấu hiệu sớm nào ngườihủy bỏ chuyển giới ước gì họ đã nhận ra sớm hơn?",
      "Giới có phải là một cấu trúc xã hội không? Điều này có nghĩa là gì?",
      "Các phong trào nữ quyền đã xem xét khái niệm giới như thế nào trong lịch sử?",
      "Không tuân thủ giới có thể giảm áp lực tuân theo vai trò giới như thế nào?",
      "Ngườihủy bỏ chuyển giới mô tả cảm giác 'sinh ra trong cơ thể sai' như thế nào?",
      "Chăm sóc khẳng định giới là gì và mục tiêu của nó là gì?",
      "Tại sao chăm sóc khẳng định giới thường là lựa chọn duy nhất ở hầu hết các khu vực?",
      "Liệu pháp khám phá giới khác với chăm sóc khẳng định giới như thế nào?",
      "Tại sao một số ngườikhông thích khái niệm liệu pháp khám phá giới, và tại sao nó bị cấm ở một số nơi?",
      "Ngườihủy bỏ chuyển giới có nghĩ rằng chăm sóc khẳng định giới và hormone nên bị cấm không?",
      "Ngườihủy bỏ chuyển giới thường hối hận về các bước y tế, xã hội, hay cả hai?",
      "Bẫy nhận dạng là gì và ngườithường nhận ra họ đang trong bẫy như thế nào?",
      "Ngườta có thể tìm nhà trị liệu cung cấp khám phá giới mở, không chỉ đạo ở đâu? Cần chú ý những dấu hiệu cảnh báo nào?",
      "Việc hỏi đại từ nhân xưng giúp hay cản trở ngườikhông tuân thủ giới?",
      "Nếu một cô bé tóc ngắn liên tục bị hỏi đại từ nhân xưng, hàm ý là gì và điều này khiến cô ấy cảm thấy thế nào?",
      "Văn hóa hủy bỏ (cancel culture) là gì và nó có ảnh hưởng gì đến đối thoại y tế công cộng?",
      "Ngườihủy bỏ chuyển giới xem chuyển giới có điểm kết thúc hay là quá trình liên tục?",
      "Tại sao một số bé gái tuổi vị thành niên trải nghiệm khó chịu về sự phát triển của ngực?",
      "Phòng vang trực tuyến (online echo-chambers) có thể ảnh hưởng đến sự hình thành nhận dạng như thế nào?",
      "Tại sao ngườihủy bỏ chuyển giới thường báo cáo cảm giác như câu chuyện và tiếng nói của họ bị im lặng trong cả cộng đồng chuyển giới và không gian chính thống?",
      "Những mô hình nhân khẩu học nào có thể thấy trong các giới thiệu đến phòng khám giới?",
      "Các nhận dạng queer đương đại khác với phong trào LGB trước đây như thế nào?",
      "Nghiên cứu hiện tại nói gì về sự chồng chéo giữa các đặc điểm phổ tự kỷ, khó chịu về giới, và nhận dạng chuyển giới?",
      "Tại sao khó chịu về giới không còn được phân loại là rối loạn tâm thần trong DSM-5?",
      "Tỷ lệ chuyển giới đã thay đổi như thế nào trong thời gian gần đây và điều gì có thể giải thích điều này?",
    ],
  },
  {
    title: "Thuật ngữ Chung",
    description: "Hiểu các khái niệm cơ bản",
    questions: [
      "Nam là gì?",
      "Nữ là gì?",
      "Giới là gì?",
      "Khó chịu về giới là gì?",
      "Nhận dạng chuyển giới là gì?",
      "Kỳ thị chuyển giới (transphobia) là gì?",
      "Văn hóa hủy bỏ (cancel culture) là gì?",
      "Nhận dạng không nhị phân là gì?",
      "Nhận dạng queer là gì?",
      "Lý thuyết queer là gì?",
      "Tính cách là gì?",
      "Tính cách khác với bản dạng giới như thế nào?",
      "Không tuân thủ giới (GNC) là gì?",
      "Tuân thủ giới là gì?",
      "Hủy bỏ chuyển giới là gì?",
      "Từ bỏ (desisting) là gì?",
      "Đại từ nhân xưng là gì và tại sao chúng quan trọng với một số ngườ?",
      "Ngườichuyển giới muốn nói gì khi họ nói về 'quyền của ngườichuyển giới'?",
      "Tại sao một số ngườichuyển giới nói 'chết chứ không hủy bỏ chuyển giới'?",
      "Những yếu tố nào được cho là gây ra khó chịu về giới?",
      "'Kinh thánh khó chịu về giới' là gì?",
      "Những chiến lược nào (y tế hoặc phi y tế) giúp ngườiquản lý khó chịu về giới?",
      "Ngườisong tính tự động là chuyển giới phải không?",
      "Linh hoạt giới là gì?",
      "AFAB và AMAB có nghĩa là gì?",
      "TERF là gì?",
      "Gọi tên cũ (deadnaming) là gì?",
      "Gọi sai giới (misgendering) là gì?",
      "Ngườithuận giới là gì?",
      "Giới tính sinh học có nghĩa là gì?",
      "Sự khác biệt giữa chuyển giới xã hội và y tế là gì?",
    ],
  },
  {
    title: "Thực tế Y tế",
    description: "Sức khỏe, thủ thuật và sự thật sinh học",
    questions: [
      "Những tác dụng phụ của việc sử dụng testosterone ở nữ là gì?",
      "Những tác dụng phụ của việc sử dụng estrogen ở nam là gì?",
      "Những thay đổi sinh lý nào testosterone có thể gây ra ở nữ và giới hạn là gì?",
      "Những thay đổi sinh lý nào estrogen có thể gây ra ở nam và giới hạn là gì?",
      "Phẫu thuật tạo dương vật (phalloplasty) bao gồm những gì và kết quả điển hình là gì?",
      "Phẫu thuật tạo âm đạo (vaginoplasty) bao gồm những gì và kết quả điển hình là gì?",
      "Có những loại phẫu thuật tạo âm đạo nào?",
      "Ngườita nên cân nhắc tiếp tục hay ngừng hormone như thế nào?",
      "Có sự khác biệt đo lường được trong tỷ lệ chẩn đoán khó chịu về giới giữa nam và nữ không?",
      "Nghiên cứu chụp ảnh não nói gì về não 'nam' so với não 'nữ'?",
      "Khó chịu về giới được phân biệt với bệnh tâm thần như thế nào trong sổ tay chẩn đoán?",
      "Teo âm đạo là gì và điều gì gây ra nó?",
      "Những lựa chọn phẫu thuật chỉnh sửa nào tồn tại cho cả vaginoplasty và phalloplasty?",
      "Các quốc gia khác nhau quản lý tài trợ công cho phẫu thuật giới như thế nào?",
      "Những lựa chọn nào tồn tại cho việc tái tạo ngực sau phẫu thuật cắt ngực?",
      "Thuốc ức chế dậy thì là gì và chúng có thực sự chỉ tạm dừng dậy thì không?",
      "Có đúng là thuốc ức chế dậy thì là cùng loại thuốc được dùng để thiến hóa học tội phạm tình dục không?",
      "Dữ liệu theo dõi dài hạn nào tồn tại cho việc sử dụng hormone chéo giới tính?",
      "Tiêu chuẩn Chăm sóc WPATH là gì và chúng được phát triển như thế nào?",
      "Giao thức Hà Lan là gì?",
      "Khó chịu về giới khởi phát nhanh (ROGD - Rapid Onset Gender Dysphoria) là gì và nó được nghiên cứu như thế nào?",
      "Tỷ lệ hối hận được báo cáo cho các phẫu thuật giới khác nhau là bao nhiêu?",
      "Liệu pháp khám phá giới trông như thế nào trong thực tế?",
    ],
  },
  {
    title: "Xã hội & Văn hóa",
    description: "Cách niềm tin về giới tương tác với thế giới",
    questions: [
      "Những hàm ý của câu chuyện 'sinh ra đã như vậy' là gì?",
      "Các nhận dạng giới có đang đóng gói và củng cố các khuôn mẫu phân biệt giới không?",
      "Chủ nghĩa nữ quyền chính thống đã thay đổi như thế nào theo thời gian để chấp nhận nhận dạng chuyển giới?",
      "Văn hóa đại từ nhân xưng có thể dẫn đến việc y tế hóa quá mức trẻ em như thế nào?",
      "Những kết quả được ghi nhận cho trẻ em chuyển giới xã hội sớm là gì?",
      "Những liên hệ nào giữa BDSM và nhận dạng chuyển giới?",
      "Khái niệm giới đã phát triển như thế nào trong lịch sử?",
      "Hoạt động chuyển giới đã tương tác với hoạt động quyền đồng tính trước đây như thế nào?",
      "Các khẩu hiệu hoặc câu thần chú lặp đi lặp lại ảnh hưởng đến tư duy phản biện trong bất kỳ cộng đồng nào như thế nào?",
      "Đối thoại giới đương đại giao thoa với nhận dạng đồng tính và đồng tính nữ như thế nào?",
      "Điều gì có thể giải thích sự gia tăng nhận dạng không nhị phân?",
      "Những lời giải thích nào tồn tại cho nguy cơ tự tử cao hơn ở cộng đồng chuyển giới?",
      "Nguy cơ tự tử được nhận thức ảnh hưởng đến đối thoại công cộng xung quanh chuyển giới như thế nào?",
      "'Phê phán giới' có nghĩa là gì và nó khác với quan điểm loại trừ chuyển giới như thế nào?",
      "'Cuộc tranh luận về nhà vệ sinh' là gì và bằng chứng nào tồn tại về tác hại hoặc an toàn?",
      "Những luận điểm chính trong tranh cãi tham gia thể thao là gì?",
      "Các trường học đã xử lý học sinh nghi ngờ về giới ở các khu vực pháp lý khác nhau như thế nào?",
      "Ngườihủy bỏ chuyển giới nghĩ gì về việc kể chuyện drag queen?",
      "Cụm từ 'y tế hóa trẻ em không tuân thủ giới' có nghĩa gì đối với những ngườiphê phán và những ngườủng hộ?",
    ],
  },
  {
    title: "Tâm lý & Nhận dạng",
    description: "Hiểu các khía cạnh tinh thần và cảm xúc",
    questions: [
      "Một ngườcó thể là nữ mà không nữ tính, hoặc nam mà không nam tính không?",
      "Mạng xã hội đóng vai trò gì trong việc ngườitạo nhận dạng giới?",
      "Chu kỳ xác thực thần kinh là gì?",
      "Tại sao ngườitự kỷ có thể được đại diện quá mức trong các phòng khám giới?",
      "Kỳ thị phụ nữ nội tâm hóa là gì và nó có thể liên quan đến khó chịu về cơ thể như thế nào?",
      "Kỳ thị đồng tính nội tâm hóa là gì?",
      "Tự kích thích bằng hình ảnh phụ nữ (autogynephilia) là gì và nó được tranh luận như thế nào trong tài liệu?",
      "Hưng phấn giới (gender euphoria) là gì?",
      "Nhận dạng chuyển giới có thể khuếch đại khó chịu về giới thay vì giảm nhẹ nó không?",
      "Tại sao xác thực bên ngoài quan trọng với một số ngườchuyển giới?",
      "Sự khác biệt giữa rối loạn ám ảnh cơ thể (BDD) và khó chịu về giới là gì?",
      "Những tương đồng nào mà các nhà lâm sàng rút ra giữa khó chịu về giới và rối loạn ăn uống?",
      "Tiền sử chấn thương có thể tương tác với khó chịu về giới như thế nào?",
      "Những lựa chọn phi y tế nào tồn tại để quản lý khó chịu về giới?",
      "'Vượt qua' (passing) có nghĩa là gì và tại sao nó có thể trở thành ám ảnh với một số ngườ?",
      "Các khái niệm Jung về anima/animus liên quan đến bản dạng giới như thế nào?",
      "Làm việc với bóng tối (shadow work) là gì và nó có thể được dùng trong trị liệu không?",
    ],
  },
  {
    title: "Hành trình Hủy bỏ Chuyển giới",
    description: "Hồi phục, hỗ trợ và tìm đường trở lại",
    questions: [
      "Làm thế nào tôi có thể hòa bình với những thay đổi vĩnh viễn tôi đã thực hiện với cơ thể?",
      "Tôi cảm thấy như một số ngườnghĩ tôi chỉ 'trở lại trong tủ quần áo' và tôi không sống đúng bản chất",
      "Có đúng là hầu hết ngườhủy bỏ chuyển giới cuối cùng lại chuyển giới lại không?",
      "Làm thế nào chuyển giới và hủy bỏ chuyển giới có thể là một phần của cùng một hành trình chữa lành?",
      "Ngườta có thể tìm nhà trị liệu có kinh nghiệm trong hỗ trợ hủy bỏ chuyển giới ở đâu?",
      "Hủy bỏ chuyển giới có nghĩa là quá trình chuyển giới ban đầu là thất bại không?",
      "CBT hoặc DBT có giúp ngườhủy bỏ chuyển giới trong việc quản lý khó chịu về giới không?",
      "Tại sao một số cộng đồng chuyển giới không khuyến khích đọc các câu chuyện hủy bỏ chuyển giới?",
      "Những nhóm hỗ trợ nào tồn tại đặc biệt cho ngườhủy bỏ chuyển giới?",
      "Làm thế nào một ngườcó thể công khai (một lần nữa) với gia đình về việc đang hủy bỏ chuyển giới?",
      "Những giai đoạn đau buồn phổ biến nào được báo cáo trong quá trình hủy bỏ chuyển giới?",
      "Thuốc gây ảo giác đóng vai trò gì trong một số câu chuyện hủy bỏ chuyển giới?",
    ],
  },
  {
    title: "Thiên kiến Học thuật & Nghiên cứu",
    description: "Đặt câu hỏi về câu chuyện trong các tổ chức",
    questions: [
      "Những lo ngại phương pháp luận nào đã được đặt ra về các cuộc khảo sát hủy bỏ chuyển giới chính?",
      "Tại sao các nhà nghiên cứu báo cáo khó khăn trong việc đảm bảo tài trợ cho các nghiên cứu hủy bỏ chuyển giới?",
      "Các nhà nghiên cứu hiện đang nhận dạng là chuyển giới có xung đột lợi ích không?",
      "Đánh giá Cass là gì và những khuyến nghị nào nó đưa ra?",
      "Điều gì đã xảy ra với nghiên cứu năm 2018 của Lisa Littman về ROGD?",
      "Đánh giá phòng khám Tavistock là gì và tại sao nó được ủy thác?",
      "Khó chịu về giới được tái phân loại như thế nào giữa DSM-IV và DSM-5?",
    ],
  },
  {
    title: "Quan điểm Gây tranh cãi",
    description:
      "Những góc nhìn hủy bỏ chuyển giới mà các nhà hoạt động giới không muốn bạn nghe",
    questions: [
      "Ai đang kiếm tiền từ chăm sóc khẳng định giới?",
      "Những yếu tố cấu trúc nào dẫn đến đại diện thấp của câu chuyện hủy bỏ chuyển giới trong truyền thông chính thống?",
      "Theo những cách nào các hệ thống niềm tin về giới giống các tôn giáo hoặc giáo phái?",
      "Các trường học có đang gạt bỏ phụ huynh khi trẻ em đưa ra lựa chọn về nhận dạng giới không?",
      "Tại sao có nhiều ngườchuyển giới nữ (ladyboys) ở Thái Lan đến vậy?",
      "Tại sao Iran là trung tâm toàn cầu cho các phẫu thuật chuyển đổi giới tính?",
    ],
  },
];
