using Windows.UI.Xaml.Controls;

namespace Solumati
{
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            this.InitializeComponent();
            WebControl.Navigate(Config.PwaUrl);
        }
    }
}
